import { toPosixPath } from "../config";

export interface ParsedArticlePath {
  category: string;
  slug: string;
}

function decodePathSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function decodeRoutePath(path: string) {
  const normalized = path.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
  if (!normalized) return normalized;

  return normalized
    .split("/")
    .filter(Boolean)
    .map(decodePathSegment)
    .join("/");
}

function encodeRouteSegment(segment: string) {
  return encodeURIComponent(segment);
}

function encodeRouteSegments(...segments: string[]) {
  return segments.filter(Boolean).map(encodeRouteSegment).join("/");
}

export function parseArticlePath(path: string): ParsedArticlePath | null {
  const normalized = decodeRoutePath(path);
  if (!normalized) return null;

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const slug = segments.pop()!;
  const category = segments.join("/");
  if (!category || !slug) return null;

  return { category, slug };
}

export function buildArticlePath(category: string, slug: string) {
  const normalizedCategory = category.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
  const normalizedSlug = slug.replace(/[/\\]/g, "-").trim();
  const categorySegments = normalizedCategory.split("/").filter(Boolean);
  return `/${encodeRouteSegments(...categorySegments, normalizedSlug)}`;
}

export function buildArchivePath(category: string) {
  const normalized = category.replace(/^\/+|\/+$/g, "").replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length) return "/archive";
  return `/archive/${encodeRouteSegments(...segments)}`;
}

export function buildAdminPostApiPath(category: string, slug: string) {
  return `/api/admin/posts/${encodeRouteSegments(
    ...toPosixPath(category, slug).split("/").filter(Boolean),
  )}`;
}

export function buildViewApiPath(category: string, slug: string) {
  return `/api/posts/${encodeRouteSegments(
    ...toPosixPath(category, slug).split("/").filter(Boolean),
  )}/view`;
}

export function parseViewApiPath(path: string): ParsedArticlePath | null {
  const normalized = decodeRoutePath(path);
  if (!normalized.endsWith("/view")) return null;
  return parseArticlePath(normalized.slice(0, -"/view".length));
}
