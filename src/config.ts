import path from "node:path";
import bcrypt from "bcryptjs";

const root = process.cwd();

let cachedAdminPasswordHash: string | undefined;

function resolveAdminPasswordHash() {
  if (process.env.ADMIN_PASSWORD_HASH) {
    return process.env.ADMIN_PASSWORD_HASH;
  }
  if (!cachedAdminPasswordHash) {
    cachedAdminPasswordHash = bcrypt.hashSync(
      process.env.ADMIN_PASSWORD || "changeme",
      10,
    );
  }
  return cachedAdminPasswordHash;
}

export const config = {
  port: Number(process.env.PORT || 3000),
  siteUrl: (process.env.SITE_URL || "http://localhost:3000").replace(/\/+$/, ""),
  siteTitle: process.env.SITE_TITLE || "Lymtu的博客",
  siteDescription:
    process.env.SITE_DESCRIPTION || "Lymtu的博客，记录一些东西。",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  get adminPasswordHash() {
    return resolveAdminPasswordHash();
  },
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  get markdownDir() {
    return process.env.BLOG_MARKDOWN_DIR
      ? path.resolve(process.env.BLOG_MARKDOWN_DIR)
      : path.join(root, "content", "markdown");
  },
  get publicDir() {
    return process.env.BLOG_PUBLIC_DIR
      ? path.resolve(process.env.BLOG_PUBLIC_DIR)
      : path.join(root, "public");
  },
  get mdInfoPath() {
    return path.join(this.publicDir, "data", "mdInfo.json");
  },
  get viewsPath() {
    return path.join(this.publicDir, "data", "views.json");
  },
  articleTemplatePath: path.join(root, "templates", "article.html"),
  archiveCategoryTemplatePath: path.join(
    root,
    "templates",
    "archive-category.html",
  ),
  adminDir: path.join(root, "src", "admin"),
  get uploadsDir() {
    return path.join(this.publicDir, "assets", "uploads");
  },
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES || 5 * 1024 * 1024),
};

export const toPosixPath = (...segments: string[]) =>
  path.join(...segments).split(path.sep).join("/");
