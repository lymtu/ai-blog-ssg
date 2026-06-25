import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config";
import { rebuildAll, serializeMarkdown } from "../services/ssg";

const EXISTING = new Set([
  "demo/markdown-showcase.md",
  "welcome/hello-world.md",
]);

interface SeedPost {
  category: string;
  slug: string;
  title: string;
  date: string;
  description: string;
  body: string;
}

function makeDate(year: number, month: number, day: number, hour = 10) {
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0)).toISOString();
}

function buildPosts(): SeedPost[] {
  const posts: SeedPost[] = [];

  const demoTopics = [
    "code-blocks",
    "lists-and-tables",
    "links-and-images",
    "blockquotes",
    "footnotes",
    "math-notes",
    "nested-headings",
    "task-lists",
    "admonitions",
    "frontmatter-tips",
    "writing-style",
    "draft-workflow",
  ];

  for (const [index, slug] of demoTopics.entries()) {
    if (slug === "markdown-showcase") continue;
    const day = (index % 28) + 1;
    posts.push({
      category: "demo",
      slug,
      title: `Demo: ${slug.replace(/-/g, " ")}`,
      date: makeDate(2025, 3 + (index % 6), day, 9 + (index % 8)),
      description: `示例文章，演示 ${slug} 相关 Markdown 写法。`,
      body: `## ${slug.replace(/-/g, " ")}

这是一篇 \`demo/${slug}\` 分类下的示例文章，用于测试同分类上下篇导航与归档页。

- 发布于 demo 分类
- 支持多级 TOC 与代码高亮

\`\`\`ts
const slug = "${slug}";
console.log(slug);
\`\`\`
`,
    });
  }

  const welcomeTopics = [
    { slug: "getting-started", title: "快速上手", year: 2026, month: 1, day: 5 },
    { slug: "content-workflow", title: "内容工作流", year: 2026, month: 2, day: 12 },
  ];

  for (const item of welcomeTopics) {
    posts.push({
      category: "welcome",
      slug: item.slug,
      title: item.title,
      date: makeDate(item.year, item.month, item.day),
      description: `${item.title} — welcome 分类示例文章。`,
      body: `## ${item.title}

欢迎阅读本篇 ${item.title} 指南。

1. 在 \`content/markdown/\` 编写 Markdown
2. 通过 Admin 或启动时 SSG 生成 HTML
3. 部署 Docker 镜像即可对外服务
`,
    });
  }

  for (let i = 1; i <= 25; i += 1) {
    const month = ((i - 1) % 12) + 1;
    const day = ((i * 2) % 27) + 1;
    posts.push({
      category: "blog/2026",
      slug: `post-${String(i).padStart(2, "0")}`,
      title: `2026 博客笔记 #${i}`,
      date: makeDate(2026, month, day, 8 + (i % 10)),
      description: `2026 年第 ${i} 篇博客笔记，用于首页分页与归档测试。`,
      body: `## 2026 笔记 ${i}

记录第 ${i} 篇 2026 博客内容。本篇位于 \`blog/2026\` 分类，用于验证：

- 首页无限滚动与分页
- 分类归档 \`/archive/blog/2026\`
- RSS 与 Sitemap 自动生成

> 发布日期散布在 2026 年各月份，便于活力表展示。
`,
    });
  }

  for (let i = 1; i <= 10; i += 1) {
    const month = ((i - 1) % 12) + 1;
    const day = ((i * 3) % 26) + 1;
    posts.push({
      category: "blog/2025",
      slug: `retro-${String(i).padStart(2, "0")}`,
      title: `2025 回顾 #${i}`,
      date: makeDate(2025, month, day, 7 + (i % 8)),
      description: `2025 年归档文章 #${i}，测试跨年分类与上下篇。`,
      body: `## 2025 回顾 ${i}

这是 2025 年的第 ${i} 篇归档文章，分类路径为 \`blog/2025\`。

正文内容仅作示例，重点在于：

1. 多级分类路径
2. 同分类 prev/next 链接
3. 日期筛选与搜索
`,
    });
  }

  return posts;
}

async function writePost(post: SeedPost) {
  const relPath = `${post.category}/${post.slug}.md`.replace(/\\/g, "/");
  if (EXISTING.has(relPath)) return false;

  const absPath = path.join(config.markdownDir, post.category, `${post.slug}.md`);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(
    absPath,
    serializeMarkdown({
      title: post.title,
      date: post.date,
      updated: post.date,
      description: post.description,
      category: post.category,
      body: post.body,
    }),
    "utf-8",
  );
  return true;
}

const posts = buildPosts();
let created = 0;

for (const post of posts) {
  if (await writePost(post)) created += 1;
}

console.log(`Seeded ${created} new markdown files (${EXISTING.size} existing kept).`);
console.log(`Total target: ~${posts.length + EXISTING.size} posts.`);

await rebuildAll();
console.log("Rebuild complete — public HTML, mdInfo, RSS, and sitemap updated.");
