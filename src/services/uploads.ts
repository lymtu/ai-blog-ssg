import fs from "node:fs/promises";
import path from "node:path";
import { config, toPosixPath } from "../config";

export interface UploadItem {
  name: string;
  url: string;
  size: number;
  updatedAt: number;
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
]);

function uploadsDir() {
  return config.uploadsDir;
}

export function isImageUploadFilename(filename: string) {
  const safeName = path.basename(filename);
  if (!safeName || safeName !== filename || safeName.startsWith(".")) {
    return false;
  }

  const ext = path.extname(safeName).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

function publicUrl(filename: string) {
  return `/assets/uploads/${toPosixPath(filename)}`;
}

function sanitizeBaseName(name: string) {
  const base = path.basename(name, path.extname(name));
  const cleaned = base
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return cleaned || "image";
}

function resolveExtension(file: File) {
  const fromMime = EXT_BY_MIME[file.type];
  if (fromMime) return fromMime;

  const ext = path.extname(file.name).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }

  return fromMime ?? ".png";
}

async function uniqueFilename(base: string, ext: string) {
  let candidate = `${base}${ext}`;
  let index = 1;

  while (true) {
    try {
      await fs.access(path.join(uploadsDir(), candidate));
      candidate = `${base}-${index}${ext}`;
      index += 1;
    } catch {
      return candidate;
    }
  }
}

export async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir(), { recursive: true });
}

export async function listUploads(): Promise<UploadItem[]> {
  await ensureUploadsDir();

  let entries;
  try {
    entries = await fs.readdir(uploadsDir(), { withFileTypes: true });
  } catch {
    return [];
  }

  const items: UploadItem[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!isImageUploadFilename(entry.name)) continue;
    const absPath = path.join(uploadsDir(), entry.name);
    const stat = await fs.stat(absPath);
    items.push({
      name: entry.name,
      url: publicUrl(entry.name),
      size: stat.size,
      updatedAt: Math.ceil(stat.mtimeMs),
    });
  }

  items.sort((a, b) => b.updatedAt - a.updatedAt);
  return items;
}

export async function saveUpload(file: File): Promise<UploadItem> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("仅支持 JPG、PNG、GIF、WebP、SVG 图片");
  }

  if (file.size > config.uploadMaxBytes) {
    throw new Error(
      `单张图片不能超过 ${Math.round(config.uploadMaxBytes / 1024 / 1024)}MB`,
    );
  }

  await ensureUploadsDir();

  const ext = resolveExtension(file);
  const base = sanitizeBaseName(file.name);
  const filename = await uniqueFilename(base, ext);
  const absPath = path.join(uploadsDir(), filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absPath, buffer);

  const stat = await fs.stat(absPath);
  return {
    name: filename,
    url: publicUrl(filename),
    size: stat.size,
    updatedAt: Math.ceil(stat.mtimeMs),
  };
}

export async function deleteUpload(filename: string) {
  if (!isImageUploadFilename(filename)) {
    throw new Error("无效的文件名");
  }

  const safeName = path.basename(filename);

  const absPath = path.join(uploadsDir(), safeName);
  try {
    await fs.unlink(absPath);
  } catch {
    throw new Error("图片不存在");
  }
}

export function isAllowedUploadFilename(filename: string) {
  return isImageUploadFilename(filename);
}
