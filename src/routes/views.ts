import { Elysia } from "elysia";
import { parseViewApiPath } from "../utils/articlePath";
import { incrementView } from "../services/views";

function parseCookieHeader(header: string | null) {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rest.join("="));
  }
  return cookies;
}

export const viewRoutes = new Elysia({ prefix: "/api/posts" })
  .get("/views", async () => {
    const { getAllViews } = await import("../services/views");
    return getAllViews();
  })
  .post(
    "/*",
    async ({ params, request, set }) => {
      const resolved = parseViewApiPath(params["*"] ?? "");
      if (!resolved) {
        set.status = 400;
        return { error: "无效的文章路径" };
      }

      const cookies = parseCookieHeader(request.headers.get("cookie"));
      const result = await incrementView(
        resolved.category,
        resolved.slug,
        cookies,
      );

      if (result.setCookie) {
        set.headers["set-cookie"] = result.setCookie;
      }

      return { views: result.views, counted: result.counted };
    },
  );
