import fs from "node:fs/promises";
import path from "node:path";
import {
  deleteArticleHtml,
  getArticleNavNeighbors,
  parseMarkdown,
  regenerateArticlesHtml,
  scanArticles,
  serializeMarkdown,
  syncSiteMetadata,
  type ArticleMeta,
} from "./ssg";
import { config } from "../config";
import { mergeViewsIntoArticles } from "./views";
import { removeEmptyDirsUpward } from "../utils/removeEmptyDirs";

export interface PostInput {
  category: string;
  slug: string;
  title: string;
  date: string;
  body: string;
  updated?: string;
  description?: string;
}

export interface PostDetail extends PostInput {
  birthTime: number;
  updatedTime?: number;
}

function mdPath(category: string, slug: string) {
  return path.join(config.markdownDir, category, `${slug}.md`);
}

function normalizeCategory(category: string) {
  return category.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
}

function normalizeSlug(slug: string) {
  return slug.replace(/[/\\]/g, "-").trim();
}

async function cleanupEmptyArticleDirs(category: string, slug: string) {
  const cat = normalizeCategory(category);
  await removeEmptyDirsUpward(path.dirname(mdPath(cat, slug)), config.markdownDir);
  await removeEmptyDirsUpward(path.join(config.publicDir, cat), config.publicDir);
}

export async function listPosts(): Promise<ArticleMeta[]> {
  return mergeViewsIntoArticles(await scanArticles());
}

export async function getPost(
  category: string,
  slug: string,
): Promise<PostDetail | null> {
  const cat = normalizeCategory(category);
  const s = normalizeSlug(slug);
  const filePath = mdPath(cat, s);

  try {
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      fs.stat(filePath),
    ]);
    const parsed = parseMarkdown(content);
    const birthTime = parsed.date
      ? Date.parse(parsed.date)
      : Math.ceil(stat.birthtimeMs);
    const updatedTime = parsed.updated ? Date.parse(parsed.updated) : undefined;

    return {
      category: cat,
      slug: s,
      title: parsed.title || s,
      date: parsed.date || new Date(birthTime).toISOString(),
      updated: parsed.updated || parsed.date || new Date(birthTime).toISOString(),
      description: parsed.description || "",
      body: parsed.body,
      birthTime,
      updatedTime:
        updatedTime !== undefined && !Number.isNaN(updatedTime)
          ? updatedTime
          : undefined,
    };
  } catch {
    return null;
  }
}

export async function createPost(input: PostInput) {
  const category = normalizeCategory(input.category);
  const slug = normalizeSlug(input.slug);

  if (!category || !slug) {
    throw new Error("分类和 slug 不能为空");
  }

  const filePath = mdPath(category, slug);
  try {
    await fs.access(filePath);
    throw new Error("文章已存在");
  } catch (err) {
    if (err instanceof Error && err.message === "文章已存在") throw err;
  }

  const date = input.date;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    serializeMarkdown({
      title: input.title,
      date,
      updated: input.updated || date,
      description: input.description,
      category,
      body: input.body,
    }),
    "utf-8",
  );

  const articles = await mergeViewsIntoArticles(await scanArticles());
  const keys = getArticleNavNeighbors(articles, category, slug);
  await regenerateArticlesHtml(keys, articles);
  return syncSiteMetadata(articles);
}

export async function updatePost(
  oldCategory: string,
  oldSlug: string,
  input: PostInput,
) {
  const prevCategory = normalizeCategory(oldCategory);
  const prevSlug = normalizeSlug(oldSlug);
  const category = normalizeCategory(input.category);
  const slug = normalizeSlug(input.slug);

  const oldPath = mdPath(prevCategory, prevSlug);
  const existing = await getPost(prevCategory, prevSlug);
  if (!existing) {
    throw new Error("文章不存在");
  }

  if (prevCategory !== category || prevSlug !== slug) {
    const newPath = mdPath(category, slug);
    try {
      await fs.access(newPath);
      throw new Error("目标路径已存在文章");
    } catch (err) {
      if (err instanceof Error && err.message === "目标路径已存在文章") throw err;
    }
  }

  const articlesBefore = await mergeViewsIntoArticles(await scanArticles());
  const oldNeighborKeys =
    prevCategory !== category || prevSlug !== slug
      ? getArticleNavNeighbors(articlesBefore, prevCategory, prevSlug, false)
      : [];

  const newContent = serializeMarkdown({
    title: input.title,
    date: input.date,
    updated: input.updated || new Date().toISOString(),
    description: input.description,
    category,
    body: input.body,
  });

  const newPath = mdPath(category, slug);
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  await fs.writeFile(newPath, newContent, "utf-8");

  if (prevCategory !== category || prevSlug !== slug) {
    try {
      await fs.unlink(oldPath);
    } catch {
      // ignore
    }
    await deleteArticleHtml(prevCategory, prevSlug);
    await cleanupEmptyArticleDirs(prevCategory, prevSlug);
  }

  const articlesAfter = await mergeViewsIntoArticles(await scanArticles());
  const newNeighborKeys = getArticleNavNeighbors(articlesAfter, category, slug);
  const keys = [...newNeighborKeys, ...oldNeighborKeys];
  await regenerateArticlesHtml(keys, articlesAfter);
  return syncSiteMetadata(articlesAfter);
}

export async function deletePost(category: string, slug: string) {
  const cat = normalizeCategory(category);
  const s = normalizeSlug(slug);
  const filePath = mdPath(cat, s);

  const articlesBefore = await mergeViewsIntoArticles(await scanArticles());
  const neighborKeys = getArticleNavNeighbors(articlesBefore, cat, s, false);

  try {
    await fs.unlink(filePath);
  } catch {
    throw new Error("文章不存在");
  }

  await deleteArticleHtml(cat, s);
  const { removeView } = await import("./views");
  await removeView(cat, s);
  await cleanupEmptyArticleDirs(cat, s);

  const articlesAfter = await mergeViewsIntoArticles(await scanArticles());
  await regenerateArticlesHtml(neighborKeys, articlesAfter);
  return syncSiteMetadata(articlesAfter);
}
