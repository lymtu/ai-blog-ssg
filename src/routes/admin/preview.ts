import { Elysia, t } from "elysia";
import { requireAuth } from "../../plugins/auth";
import { renderMarkdown } from "../../services/markdownRender";

export const previewRoutes = new Elysia({ prefix: "/api/admin/preview" })
  .use(requireAuth)
  .post(
    "/",
    async ({ body }) => {
      const { html } = await renderMarkdown(body.body || "");
      return { html };
    },
    {
      body: t.Object({
        title: t.Optional(t.String()),
        body: t.String(),
      }),
    },
  );
