import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { config, toPosixPath } from "../config";
import type { ArticleMeta } from "./ssg";

export type ViewsMap = Record<string, number>;

const VIEW_COOKIE_PREFIX = "blog_view_";
const VIEW_DEDUPE_MAX_AGE = 86_400;

function articleKey(category: string, slug: string) {
  return toPosixPath(category, slug);
}

function viewCookieName(category: string, slug: string) {
  const hash = createHash("sha256")
    .update(articleKey(category, slug))
    .digest("hex")
    .slice(0, 16);
  return `${VIEW_COOKIE_PREFIX}${hash}`;
}

async function readViews(): Promise<ViewsMap> {
  try {
    const raw = await fs.readFile(config.viewsPath, "utf-8");
    const data = JSON.parse(raw);
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

async function writeViews(views: ViewsMap) {
  await fs.mkdir(path.dirname(config.viewsPath), { recursive: true });
  await fs.writeFile(config.viewsPath, JSON.stringify(views, null, 2), "utf-8");
}

export async function getAllViews(): Promise<ViewsMap> {
  return readViews();
}

export async function getViewCount(category: string, slug: string): Promise<number> {
  const views = await readViews();
  return views[articleKey(category, slug)] ?? 0;
}

export interface IncrementViewResult {
  views: number;
  counted: boolean;
  setCookie?: string;
}

export async function incrementView(
  category: string,
  slug: string,
  cookies: Record<string, string> = {},
): Promise<IncrementViewResult> {
  const key = articleKey(category, slug);
  const cookieName = viewCookieName(category, slug);
  const dedupeValue = cookies[cookieName] || cookies[`${VIEW_COOKIE_PREFIX}${key}`];

  const views = await readViews();
  const current = views[key] ?? 0;

  if (dedupeValue === "1") {
    return { views: current, counted: false };
  }

  const next = current + 1;
  views[key] = next;
  await writeViews(views);

  const setCookie = `${cookieName}=1; Path=/; Max-Age=${VIEW_DEDUPE_MAX_AGE}; HttpOnly; SameSite=Lax`;

  return { views: next, counted: true, setCookie };
}

export async function removeView(category: string, slug: string) {
  const views = await readViews();
  const key = articleKey(category, slug);
  if (!(key in views)) return;
  delete views[key];
  await writeViews(views);
}

export async function mergeViewsIntoArticles(
  articles: ArticleMeta[],
): Promise<ArticleMeta[]> {
  const views = await readViews();
  return articles.map((article) => ({
    ...article,
    views: views[articleKey(article.type, article.baseName)] ?? 0,
  }));
}
