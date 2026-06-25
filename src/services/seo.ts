import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config";
import { buildArchivePath, buildArticlePath } from "../utils/articlePath";
import type { ArticleMeta } from "./ssg";
import { deriveDescription, formatDate, parseMarkdown } from "./ssg";
import { renderMarkdown } from "./markdownRender";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIsoDate(time: number) {
  return new Date(time).toISOString();
}

function articleLastmod(article: ArticleMeta) {
  return article.updatedTime ?? article.birthTime;
}

function latestTimestamp(times: number[]) {
  return times.length ? Math.max(...times) : Date.now();
}

function renderSitemapUrl(loc: string, lastmod?: number) {
  const lastmodBlock =
    lastmod !== undefined
      ? `\n    <lastmod>${escapeXml(toIsoDate(lastmod))}</lastmod>`
      : "";
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodBlock}
  </url>`;
}

export async function generateSeoFiles(articles: ArticleMeta[]) {
  const categories = [...new Set(articles.map((article) => article.type))].sort();
  const builtAt = Date.now();
  const siteLastUpdated = latestTimestamp(
    articles.map((article) => articleLastmod(article)),
  );

  const sitemapEntries = [
    renderSitemapUrl(`${config.siteUrl}/`, siteLastUpdated),
    renderSitemapUrl(`${config.siteUrl}/about`, builtAt),
    ...articles.map((article) =>
      renderSitemapUrl(
        `${config.siteUrl}${buildArticlePath(article.type, article.baseName)}`,
        articleLastmod(article),
      ),
    ),
    ...categories.map((category) => {
      const inCategory = articles.filter((article) => article.type === category);
      return renderSitemapUrl(
        `${config.siteUrl}${buildArchivePath(category)}`,
        latestTimestamp(inCategory.map((article) => articleLastmod(article))),
      );
    }),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join("\n")}
</urlset>
`;

  const latestArticles = [...articles]
    .sort((a, b) => b.birthTime - a.birthTime)
    .slice(0, 20);

  const rssItems = await Promise.all(
    latestArticles.map(async (article) => {
      const mdPath = path.join(
        config.markdownDir,
        article.type,
        `${article.baseName}.md`,
      );
      let description = article.title;
      let contentEncoded = "";
      try {
        const content = await fs.readFile(mdPath, "utf-8");
        const parsed = parseMarkdown(content);
        description = deriveDescription(parsed) || article.title;
        const { html } = await renderMarkdown(parsed.body);
        contentEncoded = html;
      } catch {
        // ignore missing file
      }

      const link = `${config.siteUrl}${buildArticlePath(article.type, article.baseName)}`;
      const encodedBlock = contentEncoded
        ? `\n      <content:encoded><![CDATA[${contentEncoded}]]></content:encoded>`
        : "";
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${new Date(article.birthTime).toUTCString()}</pubDate>
      <description>${escapeXml(description)}</description>${encodedBlock}
    </item>`;
    }),
  );

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(config.siteTitle)}</title>
    <link>${escapeXml(config.siteUrl)}/</link>
    <description>${escapeXml(config.siteDescription)}</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${rssItems.join("\n")}
  </channel>
</rss>
`;

  const robots = `User-agent: *
Allow: /

Sitemap: ${config.siteUrl}/sitemap.xml
`;

  await Promise.all([
    fs.writeFile(path.join(config.publicDir, "sitemap.xml"), sitemap, "utf-8"),
    fs.writeFile(path.join(config.publicDir, "rss.xml"), rss, "utf-8"),
    fs.writeFile(path.join(config.publicDir, "robots.txt"), robots, "utf-8"),
  ]);
}

export function formatArchiveDate(time: number) {
  return formatDate(time, "yyyy-MM-dd");
}

export { toIsoDate };
