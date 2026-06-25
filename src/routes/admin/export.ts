import path from "node:path";
import archiver from "archiver";
import { Elysia } from "elysia";
import { requireAuth } from "../../plugins/auth";
import { config } from "../../config";

export const exportRoutes = new Elysia({ prefix: "/api/admin/export" })
  .use(requireAuth)
  .get("/markdown", ({ set }) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk) => chunks.push(chunk as Buffer));

    const done = new Promise<Buffer>((resolve, reject) => {
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);
    });

    archive.directory(config.markdownDir, "markdown");
    archive.finalize();

    set.headers["content-type"] = "application/zip";
    set.headers["content-disposition"] =
      'attachment; filename="markdown-export.zip"';

    return done;
  });
