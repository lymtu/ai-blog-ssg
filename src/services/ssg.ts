import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { config, toPosixPath } from "../config";
import { injectIndexPage } from "./archivePage";
import { injectStaticPagesSeo } from "./seoHead";
import { renderMarkdown, renderTocHtml } from "./markdownRender";
import { mergeViewsIntoArticles } from "./views";
import { generateCategoryArchives } from "./categoryArchive";
import { ensureUploadsDir } from "./uploads";
import { generateSeoFiles } from "./seo";
import { buildArchivePath, buildArticlePath } from "../utils/articlePath";
import { buildSeoHeadBlock, absoluteUrl } from "./seoHead";

export interface ArticleMeta {
  baseName: string;
  type: string;
  title: string;
  birthTime: number;
  ctimeMs: number;
  updatedTime?: number;
  views?: number;
}

export interface ParsedMarkdown {
  title: string;
  date?: string;
  updated?: string;
  description?: string;
  category?: string;
  body: string;
}

export interface ArticleTemplateVars {
  title: string;
  description: string;
  category: string;
  categoryArchivePath: string;
  slug: string;
  dateFormatted: string;
  dateIso: string;
  updatedBlock: string;
  tocBlock: string;
  content: string;
  articleNavBlock: string;
  seoHead: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const DESCRIPTION_MAX_LENGTH = 160;

function parseFrontmatterLine(line: string): [string, string] | null {
  const idx = line.indexOf(":");
  if (idx === -1) return null;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  return [key, value];
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

import { formatDateInShanghai } from "../utils/datetime";

export function formatDate(time: number | string, format = "yyyy-MM-dd HH:mm:ss") {
  return formatDateInShanghai(time, format);
}

function stripMarkdown(text: string) {
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function deriveDescription(parsed: ParsedMarkdown) {
  if (parsed.description?.trim()) {
    return parsed.description.trim();
  }

  const firstBlock = parsed.body
    .split(/\n\s*\n/)
    .map((block) => stripMarkdown(block))
    .find(Boolean);

  if (!firstBlock) return "";

  if (firstBlock.length <= DESCRIPTION_MAX_LENGTH) {
    return firstBlock;
  }

  return `${firstBlock.slice(0, DESCRIPTION_MAX_LENGTH - 1)}…`;
}

export function parseMarkdown(content: string): ParsedMarkdown {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { title: "", body: content.trim() };
  }

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const parsed = parseFrontmatterLine(line);
    if (parsed) meta[parsed[0]] = parsed[1];
  }

  return {
    title: meta.title || "",
    date: meta.date,
    updated: meta.updated,
    description: meta.description,
    category: meta.category,
    body: match[2].trim(),
  };
}

export function serializeMarkdown(data: {
  title: string;
  date: string;
  category: string;
  body: string;
  updated?: string;
  description?: string;
}): string {
  const lines = [`title: ${data.title}`];

  if (data.description?.trim()) {
    lines.push(`description: ${data.description.trim()}`);
  }

  lines.push(`date: ${data.date}`);

  if (data.updated) {
    lines.push(`updated: ${data.updated}`);
  }

  lines.push(`category: ${data.category}`);

  return `---\n${lines.join("\n")}\n---\n\n${data.body.trim()}\n`;
}

export function buildArticleTemplateVars(
  parsed: ParsedMarkdown,
  category: string,
  slug: string,
  htmlContent: string,
  tocBlock = "",
  articleNavBlock = "",
): ArticleTemplateVars {
  const title = parsed.title || slug;
  const description = deriveDescription(parsed);
  const dateSource = parsed.date ? Date.parse(parsed.date) : Date.now();
  const dateIso = Number.isNaN(dateSource)
    ? new Date().toISOString()
    : new Date(dateSource).toISOString();

  let updatedBlock = "";
  if (parsed.updated) {
    const updatedMs = Date.parse(parsed.updated);
    if (!Number.isNaN(updatedMs)) {
      const updatedIso = new Date(updatedMs).toISOString();
      updatedBlock = `<time datetime="${updatedIso}">更新 ${formatDate(updatedMs, "yyyy-MM-dd")}</time>`;
    }
  }

  return {
    title: escapeHtml(title),
    description: escapeHtml(description),
    category: escapeHtml(category),
    categoryArchivePath: escapeHtml(buildArchivePath(category)),
    slug: escapeHtml(slug),
    dateFormatted: formatDate(dateSource, "yyyy-MM-dd"),
    dateIso,
    updatedBlock,
    tocBlock,
    content: htmlContent,
    articleNavBlock,
    seoHead: buildSeoHeadBlock(
      absoluteUrl(buildArticlePath(category, slug)),
    ),
  };
}

export interface ArticleKey {
  category: string;
  slug: string;
}

function articleKeyId(key: ArticleKey) {
  return `${key.category}/${key.slug}`;
}

export function getArticleNavNeighbors(
  articles: ArticleMeta[],
  category: string,
  slug: string,
  includeSelf = true,
): ArticleKey[] {
  const inCategory = articles
    .filter((article) => article.type === category)
    .sort((a, b) => b.birthTime - a.birthTime);

  const index = inCategory.findIndex((article) => article.baseName === slug);
  const keys: ArticleKey[] = [];
  const seen = new Set<string>();

  const add = (article: ArticleMeta | null) => {
    if (!article) return;
    const id = `${article.type}/${article.baseName}`;
    if (seen.has(id)) return;
    seen.add(id);
    keys.push({ category: article.type, slug: article.baseName });
  };

  if (index === -1) {
    if (includeSelf) {
      keys.push({ category, slug });
    }
    return keys;
  }

  if (includeSelf) add(inCategory[index]);
  add(index + 1 < inCategory.length ? inCategory[index + 1] : null);
  add(index - 1 >= 0 ? inCategory[index - 1] : null);
  return keys;
}

function dedupeArticleKeys(keys: ArticleKey[]) {
  const seen = new Set<string>();
  return keys.filter((key) => {
    const id = articleKeyId(key);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
function renderArticleNavBlock(articles: ArticleMeta[], category: string, slug: string) {
  const inCategory = articles
    .filter((article) => article.type === category)
    .sort((a, b) => b.birthTime - a.birthTime);

  const index = inCategory.findIndex(
    (article) => article.baseName === slug,
  );
  if (index === -1) return "";

  const prev = index + 1 < inCategory.length ? inCategory[index + 1] : null;
  const next = index - 1 >= 0 ? inCategory[index - 1] : null;
  if (!prev && !next) return "";

  const renderLink = (
    article: ArticleMeta,
    direction: "prev" | "next",
    label: string,
  ) => {
    const href = articleUrl(article.type, article.baseName);
    const title = escapeHtml(article.title || article.baseName);
    return `<a class="article-nav__link article-nav__link--${direction}" href="${href}">
<span class="article-nav__label">${label}</span>
<span class="article-nav__title">${title}</span>
</a>`;
  };

  const parts: string[] = [];
  if (prev) {
    parts.push(renderLink(prev, "prev", "上一篇"));
  } else {
    parts.push(`<span class="article-nav__spacer"></span>`);
  }
  if (next) {
    parts.push(renderLink(next, "next", "下一篇"));
  } else {
    parts.push(`<span class="article-nav__spacer"></span>`);
  }

  return `<nav class="article-nav" aria-label="文章导航">${parts.join("")}</nav>`;
}

function renderArticleHtml(template: string, vars: ArticleTemplateVars) {
  return template
    .replaceAll("{{title}}", vars.title)
    .replaceAll("{{description}}", vars.description)
    .replaceAll("{{category}}", vars.category)
    .replaceAll("{{categoryArchivePath}}", vars.categoryArchivePath)
    .replaceAll("{{slug}}", vars.slug)
    .replaceAll("{{dateFormatted}}", vars.dateFormatted)
    .replaceAll("{{dateIso}}", vars.dateIso)
    .replaceAll("{{updatedBlock}}", vars.updatedBlock)
    .replaceAll("{{tocBlock}}", vars.tocBlock)
    .replaceAll("{{content}}", vars.content)
    .replaceAll("{{articleNavBlock}}", vars.articleNavBlock)
    .replaceAll("{{seoHead}}", vars.seoHead);
}

async function readTemplate(): Promise<string> {
  return fs.readFile(config.articleTemplatePath, "utf-8");
}

export async function ensureDirs() {
  await fs.mkdir(config.markdownDir, { recursive: true });
  await fs.mkdir(path.dirname(config.mdInfoPath), { recursive: true });
  await fs.mkdir(path.dirname(config.viewsPath), { recursive: true });
  await fs.mkdir(config.publicDir, { recursive: true });
  await ensureUploadsDir();
}

export async function scanArticles(): Promise<ArticleMeta[]> {
  await ensureDirs();

  const files = await fg("**/*.md", {
    cwd: config.markdownDir,
    onlyFiles: true,
  });

  const articles: ArticleMeta[] = [];

  for (const relPath of files) {
    const baseName = path.basename(relPath, ".md");
    const type = path.dirname(relPath);
    const normalizedType = type === "." ? "" : type.split(path.sep).join("/");

    const absPath = path.join(config.markdownDir, relPath);
    const [content, stat] = await Promise.all([
      fs.readFile(absPath, "utf-8"),
      fs.stat(absPath),
    ]);

    const parsed = parseMarkdown(content);
    const birthTime = parsed.date
      ? Date.parse(parsed.date)
      : Math.ceil(stat.birthtimeMs);
    const updatedTime = parsed.updated ? Date.parse(parsed.updated) : undefined;

    articles.push({
      baseName,
      type: normalizedType,
      title: parsed.title || baseName,
      birthTime: Number.isNaN(birthTime) ? Math.ceil(stat.birthtimeMs) : birthTime,
      ctimeMs: Math.ceil(stat.ctimeMs),
      updatedTime:
        updatedTime !== undefined && !Number.isNaN(updatedTime)
          ? updatedTime
          : undefined,
    });
  }

  articles.sort((a, b) => b.birthTime - a.birthTime);
  return articles;
}

export async function writeMdInfo(articles: ArticleMeta[]) {
  await fs.mkdir(path.dirname(config.mdInfoPath), { recursive: true });
  await fs.writeFile(config.mdInfoPath, JSON.stringify(articles, null, 2), "utf-8");
}

export async function syncSiteMetadata(articles?: ArticleMeta[]) {
  const merged = articles
    ? await mergeViewsIntoArticles(articles)
    : await mergeViewsIntoArticles(await scanArticles());

  await writeMdInfo(merged);
  await injectIndexPage(merged);
  await injectStaticPagesSeo();
  await generateCategoryArchives(merged);
  await generateSeoFiles(merged);
  return merged;
}

export async function regenerateArticlesHtml(
  keys: ArticleKey[],
  articles?: ArticleMeta[],
) {
  const uniqueKeys = dedupeArticleKeys(keys);
  if (uniqueKeys.length === 0) return;

  const articleList =
    articles ?? (await mergeViewsIntoArticles(await scanArticles()));

  for (const { category, slug } of uniqueKeys) {
    const mdPath = path.join(config.markdownDir, category, `${slug}.md`);
    const content = await fs.readFile(mdPath, "utf-8");
    const parsed = parseMarkdown(content);
    await generateArticleHtml({
      category,
      slug,
      parsed,
      articles: articleList,
    });
  }
}

export async function regenerateMdInfo() {
  const articles = await mergeViewsIntoArticles(await scanArticles());
  await regenerateArticlesHtml(
    articles.map((article) => ({
      category: article.type,
      slug: article.baseName,
    })),
    articles,
  );
  return syncSiteMetadata(articles);
}

export async function generateArticleHtml(input: {
  category: string;
  slug: string;
  parsed: ParsedMarkdown;
  articles?: ArticleMeta[];
}) {
  const { category, slug, parsed, articles = [] } = input;
  const { html: htmlContent, toc } = await renderMarkdown(parsed.body);
  const template = await readTemplate();
  const tocBlock = renderTocHtml(toc);
  const articleNavBlock = renderArticleNavBlock(articles, category, slug);
  const vars = buildArticleTemplateVars(
    parsed,
    category,
    slug,
    htmlContent,
    tocBlock,
    articleNavBlock,
  );
  const html = renderArticleHtml(template, vars);

  const outputDir = path.join(config.publicDir, category);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, `${slug}.html`), html, "utf-8");
}

export async function regenerateArticleFromFile(category: string, slug: string) {
  const articles = await mergeViewsIntoArticles(await scanArticles());
  await regenerateArticlesHtml([{ category, slug }], articles);
}

export async function deleteArticleHtml(category: string, slug: string) {
  const htmlPath = path.join(config.publicDir, category, `${slug}.html`);
  try {
    await fs.unlink(htmlPath);
  } catch {
    // ignore missing file
  }
}

const STATIC_ROOT_HTML = new Set(["index.html", "about.html", "404.html"]);

export async function cleanupOrphanArticleHtml(articles: ArticleMeta[]) {
  const activeKeys = new Set(
    articles.map((article) =>
      toPosixPath(article.type, `${article.baseName}.html`),
    ),
  );

  const files = await fg("**/*.html", {
    cwd: config.publicDir,
    onlyFiles: true,
    ignore: ["archive/**"],
  }).catch(() => [] as string[]);

  for (const relPath of files) {
    const posixPath = relPath.split(path.sep).join("/");
    if (STATIC_ROOT_HTML.has(posixPath)) continue;
    if (!posixPath.includes("/")) continue;
    if (activeKeys.has(posixPath)) continue;

    try {
      await fs.unlink(path.join(config.publicDir, relPath));
    } catch {
      // ignore missing file
    }
  }
}

export async function rebuildAll() {
  const articles = await mergeViewsIntoArticles(await scanArticles());
  await regenerateArticlesHtml(
    articles.map((article) => ({
      category: article.type,
      slug: article.baseName,
    })),
    articles,
  );
  await cleanupOrphanArticleHtml(articles);
  return syncSiteMetadata(articles);
}

export function articleUrl(category: string, slug: string) {
  return `/${toPosixPath(category, slug)}`;
}
