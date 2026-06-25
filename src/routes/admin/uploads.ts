import { Elysia, t } from "elysia";
import { requireAuth } from "../../plugins/auth";
import {
  deleteUpload,
  isAllowedUploadFilename,
  listUploads,
  saveUpload,
} from "../../services/uploads";

export const uploadRoutes = new Elysia({ prefix: "/api/admin/uploads" })
  .use(requireAuth)
  .get("/", async () => listUploads())
  .post(
    "/",
    async ({ body, set }) => {
      const files = [
        ...(body.files ?? []),
        ...(body.file ? [body.file] : []),
      ];

      if (files.length === 0) {
        set.status = 400;
        return { error: "请选择要上传的图片" };
      }

      try {
        const uploads = [];
        for (const file of files) {
          uploads.push(await saveUpload(file));
        }
        return { ok: true, uploads };
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "上传失败" };
      }
    },
    {
      body: t.Object({
        file: t.Optional(
          t.File({
            maxSize: "5m",
            type: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "image/svg+xml",
            ],
          }),
        ),
        files: t.Optional(
          t.Files({
            maxSize: "5m",
            type: [
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
              "image/svg+xml",
            ],
          }),
        ),
      }),
    },
  )
  .delete(
    "/*",
    async ({ params, set }) => {
      const filename = params["*"] ?? "";
      if (!isAllowedUploadFilename(filename)) {
        set.status = 400;
        return { error: "无效的文件名" };
      }

      try {
        await deleteUpload(filename);
        return { ok: true };
      } catch (err) {
        set.status = 404;
        return { error: err instanceof Error ? err.message : "删除失败" };
      }
    },
  );
