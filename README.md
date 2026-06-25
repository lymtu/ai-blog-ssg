# ai-blog-ssg

Bun + Elysia 博客：Markdown 为内容源，Docker 部署，Nginx 反代 HTTPS。

## 部署

```bash
cp .env.example .env
# 编辑 .env：SITE_URL、ADMIN_PASSWORD、JWT_SECRET
docker compose up -d --build
```

| 变量 | 说明 |
|------|------|
| `PORT` | 容器内端口，默认 `3000` |
| `SITE_URL` | 公网 HTTPS 地址，如 `https://example.com`（勿填 `:3000`） |
| `ADMIN_PASSWORD` / `JWT_SECRET` | 生产环境必改 |

Nginx 反代示例：`proxy_pass http://127.0.0.1:3000`，并设置 `X-Forwarded-Proto`。

**Volume**：仅挂载 `content/markdown`、`public/data`、`public/assets/uploads`。勿挂载整个 `public/`。

容器启动时会 `rebuildAll()`，根据 Markdown 生成 HTML 与 SEO 文件。修改 `SITE_URL` 后重启容器即可。

## 本地开发

```bash
bun install
cd frontend && bun install && cd ..
bun run build:frontend
bun run dev
```

管理端：`/admin`（默认 `admin` / `changeme`，仅本地试用）。

## 目录

- `content/markdown/` — 文章源（仓库为空目录，部署后通过 Admin 或挂载 volume 写入）
- `frontend/` — Vite + Lit 前端源码
- `src/` — Elysia 后端与管理端
- `templates/` — 文章 / 归档 HTML 模板
