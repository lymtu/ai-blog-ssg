import fs from "node:fs/promises";
import path from "node:path";
import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { authRoutes } from "./routes/auth";
import { adminPostRoutes } from "./routes/admin/posts";
import { previewRoutes } from "./routes/admin/preview";
import { exportRoutes } from "./routes/admin/export";
import { uploadRoutes } from "./routes/admin/uploads";
import { viewRoutes } from "./routes/views";
import { parseArticlePath, decodeRoutePath } from "./utils/articlePath";

const adminIndex = Bun.file(path.join(config.adminDir, "index.html"));
const adminApp = Bun.file(path.join(config.adminDir, "app.js"));
const adminDatetime = Bun.file(path.join(config.adminDir, "datetime.js"));
const adminStyle = Bun.file(path.join(config.adminDir, "admin.css"));
const adminPreviewStyle = Bun.file(path.join(config.adminDir, "admin-preview.css"));

const MIME_TYPES: Record<string, string> = {
  ".js": "application/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".html": "text/html;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".xml": "application/xml;charset=utf-8",
  ".txt": "text/plain;charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const RESERVED_TOP_LEVEL = new Set([
  "admin",
  "api",
  "archive",
  "assets",
  "data",
  "about",
]);

function resolvePublicPath(relativePath: string) {
  const segments = relativePath.split(/[/\\]/).filter(Boolean);
  return path.join(config.publicDir, ...segments);
}

function getContentType(relativePath: string, file: ReturnType<typeof Bun.file>) {
  if (file.type) return file.type;
  return MIME_TYPES[path.extname(relativePath).toLowerCase()] ?? "application/octet-stream";
}

async function servePublic(relativePath: string, contentType?: string) {
  const filePath = resolvePublicPath(relativePath);
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }

  const file = Bun.file(filePath);
  const type = contentType ?? getContentType(relativePath, file);
  const headers: Record<string, string> = { "content-type": type };
  if (file.size >= 0) {
    headers["content-length"] = String(file.size);
  }
  return new Response(file, { headers });
}

async function serveNotFound(set: { status?: number | string }) {
  const res = await servePublic("404.html", "text/html;charset=utf-8");
  set.status = 404;
  return res ?? "Not Found";
}

async function serveArticle(category: string, slug: string) {
  return servePublic(`${category}/${slug}.html`, "text/html;charset=utf-8");
}

async function serveArchive(categoryPath: string) {
  const decoded = decodeRoutePath(categoryPath);
  const segments = decoded.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const fileName = `${segments.pop()}.html`;
  const relative = path.join("archive", ...segments, fileName);
  return servePublic(relative.split(path.sep).join("/"), "text/html;charset=utf-8");
}

export function createApp() {
  return new Elysia()
    .use(
      cors({
        origin: true,
        credentials: true,
      }),
    )
    .use(authRoutes)
    .use(adminPostRoutes)
    .use(previewRoutes)
    .use(exportRoutes)
    .use(uploadRoutes)
    .use(viewRoutes)
    .get("/admin", () => adminIndex)
    .get("/admin/app.js", () =>
      new Response(adminApp, {
        headers: { "content-type": "application/javascript;charset=utf-8" },
      }),
    )
    .get("/admin/datetime.js", () =>
      new Response(adminDatetime, {
        headers: { "content-type": "application/javascript;charset=utf-8" },
      }),
    )
    .get("/admin/admin.css", () =>
      new Response(adminStyle, {
        headers: { "content-type": "text/css;charset=utf-8" },
      }),
    )
    .get("/admin/admin-preview.css", () =>
      new Response(adminPreviewStyle, {
        headers: { "content-type": "text/css;charset=utf-8" },
      }),
    )
    .get("/about", async ({ set }) => {
      const res = await servePublic("about.html", "text/html;charset=utf-8");
      if (res) return res;
      return serveNotFound(set);
    })
    .get("/", async ({ set }) => {
      const res = await servePublic("index.html", "text/html;charset=utf-8");
      if (res) return res;
      return serveNotFound(set);
    })
    .get("/archive/*", async ({ params, set }) => {
      const archivePath = params["*"] ?? "";
      const res = await serveArchive(archivePath);
      if (res) return res;
      return serveNotFound(set);
    })
    .get("/*", async ({ params, request, set }) => {
      const pathname = new URL(request.url).pathname.replace(/^\/+|\/+$/g, "");
      const wildcardPath = params["*"] ?? pathname;

      if (!wildcardPath) {
        return serveNotFound(set);
      }

      const firstSegment = wildcardPath.split("/")[0];
      if (firstSegment && RESERVED_TOP_LEVEL.has(firstSegment)) {
        if (firstSegment === "assets" || firstSegment === "data") {
          const res = await servePublic(
            wildcardPath,
            firstSegment === "data" ? "application/json;charset=utf-8" : undefined,
          );
          if (res) return res;
        }
        return serveNotFound(set);
      }

      const parsed = parseArticlePath(wildcardPath);
      if (parsed) {
        if (!parsed.slug.includes(".")) {
          const articleRes = await serveArticle(parsed.category, parsed.slug);
          if (articleRes) return articleRes;
        }
      }

      const staticRes = await servePublic(wildcardPath);
      if (staticRes) return staticRes;

      return serveNotFound(set);
    })
    .use(
      staticPlugin({
        assets: config.publicDir,
        prefix: "/",
      }),
    );
}

export type App = ReturnType<typeof createApp>;
