import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { config } from "../config";
import { applyTemplateTokens } from "../utils/templateReplace";
import { buildArchivePath, buildArticlePath } from "../utils/articlePath";
import { escapeHtml, formatDate, type ArticleMeta } from "./ssg";
import { absoluteUrl, buildSeoHeadBlock } from "./seoHead";

function renderArchiveList(articles: ArticleMeta[]) {
  if (articles.length === 0) {
    return `<li class="empty">暂无文章</li>`;
  }

  return articles
    .map((article) => {
      const href = buildArticlePath(article.type, article.baseName);
      const date = formatDate(article.birthTime, "yyyy-MM-dd");
      const views = article.views ?? 0;
      return `<li>
  <a href="${href}">
    <span class="dir">[ ${escapeHtml(article.type)} ]</span>
    <span class="basename">${escapeHtml(article.title || article.baseName)}</span>
    <span class="birthtime">${date}</span>
    <span class="views">${views} 次阅读</span>
    <div class="arrow">
      <img class="light" src="/arrow-left-up.svg" alt="" />
      <img class="dark" src="/arrow-left-up-light.svg" alt="" />
    </div>
  </a>
</li>`;
    })
    .join("\n");
}

function buildArchiveDataJson(articles: ArticleMeta[], category: string) {
  const payload = articles.map((article) => ({
    href: buildArticlePath(article.type, article.baseName),
    category,
    title: article.title || article.baseName,
    date: formatDate(article.birthTime, "yyyy-MM-dd"),
    views: article.views ?? 0,
  }));
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

async function readTemplate() {
  return fs.readFile(config.archiveCategoryTemplatePath, "utf-8");
}

function archiveHtmlPath(category: string) {
  const segments = category.split("/").filter(Boolean);
  if (segments.length === 0) {
    return path.join(config.publicDir, "archive", "index.html");
  }
  const fileName = `${segments.pop()}.html`;
  return path.join(config.publicDir, "archive", ...segments, fileName);
}

export async function generateCategoryArchives(articles: ArticleMeta[]) {
  const template = await readTemplate();
  const categories = [...new Set(articles.map((article) => article.type))].sort();
  const generated = new Set<string>();

  for (const category of categories) {
    const inCategory = articles
      .filter((article) => article.type === category)
      .sort((a, b) => b.birthTime - a.birthTime);

    const html = applyTemplateTokens(template, {
      "{{category}}": escapeHtml(category),
      "{{archivePath}}": escapeHtml(buildArchivePath(category)),
      "{{seoHead}}": buildSeoHeadBlock(absoluteUrl(buildArchivePath(category))),
      "{{count}}": String(inCategory.length),
      "{{list}}": renderArchiveList(inCategory),
      "{{archiveData}}": buildArchiveDataJson(inCategory, category),
    });

    const outputPath = archiveHtmlPath(category);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, html, "utf-8");
    generated.add(category);
  }

  await cleanupOrphanArchives(generated);
}

async function cleanupOrphanArchives(activeCategories: Set<string>) {
  const files = await fg("**/*.html", {
    cwd: path.join(config.publicDir, "archive"),
    onlyFiles: true,
  }).catch(() => [] as string[]);

  for (const relPath of files) {
    const category = relPath.replace(/\.html$/i, "").split(path.sep).join("/");
    if (!activeCategories.has(category)) {
      try {
        await fs.unlink(path.join(config.publicDir, "archive", relPath));
      } catch {
        // ignore
      }
    }
  }
}
