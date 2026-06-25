import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function absoluteUrl(relativePath: string) {
  const normalized = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${config.siteUrl}${normalized}`;
}

export function buildRssAlternateLink() {
  return `<link rel="alternate" type="application/rss+xml" title="${escapeHtml(config.siteTitle)}" href="${escapeHtml(absoluteUrl("/rss.xml"))}" />`;
}

export function buildCanonicalLink(canonicalUrl: string) {
  return `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
}

export function buildOgUrlMeta(canonicalUrl: string) {
  return `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`;
}

export function buildSeoHeadBlock(canonicalUrl: string, options: { includeRss?: boolean } = {}) {
  const parts: string[] = [];
  if (options.includeRss !== false) {
    parts.push(buildRssAlternateLink());
  }
  parts.push(buildCanonicalLink(canonicalUrl));
  parts.push(buildOgUrlMeta(canonicalUrl));
  return parts.join("\n    ");
}

const SEO_HEAD_BLOCK_RE =
  /<link rel="alternate" type="application\/rss\+xml"[^>]*>\s*<link rel="canonical"[^>]*>\s*<meta property="og:url"[^>]*>/;

export async function injectStaticPagesSeo() {
  const pages = [
    { file: "index.html", path: "/" },
    { file: "about.html", path: "/about" },
  ];

  for (const { file, path: pagePath } of pages) {
    const filePath = path.join(config.publicDir, file);
    let html: string;
    try {
      html = await fs.readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    const seoHead = buildSeoHeadBlock(absoluteUrl(pagePath));

    if (html.includes("<!-- SSG:SEO_HEAD -->")) {
      html = html.replace("<!-- SSG:SEO_HEAD -->", seoHead);
    } else if (SEO_HEAD_BLOCK_RE.test(html)) {
      html = html.replace(SEO_HEAD_BLOCK_RE, seoHead);
    } else {
      html = html.replace(
        /(<meta name="viewport"[^>]*>)/,
        `$1\n    ${seoHead}`,
      );
    }

    await fs.writeFile(filePath, html, "utf-8");
  }
}
