import { Elysia, t } from "elysia";
import { requireAuth } from "../../plugins/auth";
import { parseArticlePath } from "../../utils/articlePath";
import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  updatePost,
} from "../../services/posts";

function resolveArticleParams(path: string) {
  const parsed = parseArticlePath(path);
  if (!parsed) return null;
  return parsed;
}

export const adminPostRoutes = new Elysia({ prefix: "/api/admin/posts" })
  .use(requireAuth)
  .get("/", async () => listPosts())
  .get(
    "/*",
    async ({ params, set }) => {
      const resolved = resolveArticleParams(params["*"] ?? "");
      if (!resolved) {
        set.status = 400;
        return { error: "无效的文章路径" };
      }

      const post = await getPost(resolved.category, resolved.slug);
      if (!post) {
        set.status = 404;
        return { error: "文章不存在" };
      }
      return post;
    },
  )
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const posts = await createPost(body);
        return { ok: true, posts };
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "创建失败" };
      }
    },
    {
      body: t.Object({
        category: t.String(),
        slug: t.String(),
        title: t.String(),
        date: t.String(),
        body: t.String(),
        updated: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    },
  )
  .put(
    "/*",
    async ({ params, body, set }) => {
      const resolved = resolveArticleParams(params["*"] ?? "");
      if (!resolved) {
        set.status = 400;
        return { error: "无效的文章路径" };
      }

      try {
        const posts = await updatePost(
          resolved.category,
          resolved.slug,
          body,
        );
        return { ok: true, posts };
      } catch (err) {
        set.status = 400;
        return { error: err instanceof Error ? err.message : "更新失败" };
      }
    },
    {
      body: t.Object({
        category: t.String(),
        slug: t.String(),
        title: t.String(),
        date: t.String(),
        body: t.String(),
        updated: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    },
  )
  .delete(
    "/*",
    async ({ params, set }) => {
      const resolved = resolveArticleParams(params["*"] ?? "");
      if (!resolved) {
        set.status = 400;
        return { error: "无效的文章路径" };
      }

      try {
        const posts = await deletePost(resolved.category, resolved.slug);
        return { ok: true, posts };
      } catch (err) {
        set.status = 404;
        return { error: err instanceof Error ? err.message : "删除失败" };
      }
    },
  );
