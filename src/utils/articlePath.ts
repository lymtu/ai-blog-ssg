import { toPosixPath } from "../config";

export interface ParsedArticlePath {
  category: string;
  slug: string;
}

export function parseArticlePath(path: string): ParsedArticlePath | null {
  const normalized = path.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
  if (!normalized) return null;

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const slug = segments.pop()!;
  const category = segments.join("/");
  if (!category || !slug) return null;

  return { category, slug };
}

export function buildArticlePath(category: string, slug: string) {
  return `/${toPosixPath(category, slug)}`;
}

export function buildArchivePath(category: string) {
  const normalized = category.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
  return `/archive/${normalized}`;
}

export function buildAdminPostApiPath(category: string, slug: string) {
  return `/api/admin/posts/${toPosixPath(category, slug)}`;
}

export function buildViewApiPath(category: string, slug: string) {
  return `/api/posts/${toPosixPath(category, slug)}/view`;
}

export function parseViewApiPath(path: string): ParsedArticlePath | null {
  const normalized = path.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
  if (!normalized.endsWith("/view")) return null;
  return parseArticlePath(normalized.slice(0, -"/view".length));
}
