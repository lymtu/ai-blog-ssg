import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { buildSeoHeadBlock, absoluteUrl } from "./seoHead";
import { generateSeoFiles } from "./seo";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ArticleMeta } from "./ssg";

describe("seoHead", () => {
  beforeEach(() => {
    process.env.SITE_URL = "https://example.com";
    process.env.SITE_TITLE = "Test Blog";
  });

  afterEach(() => {
    delete process.env.SITE_URL;
    delete process.env.SITE_TITLE;
  });

  it("builds rss alternate, canonical, and og:url", () => {
    const block = buildSeoHeadBlock(absoluteUrl("/welcome/hello-world"));
    expect(block).toContain('rel="alternate"');
    expect(block).toContain('type="application/rss+xml"');
    expect(block).toContain('/rss.xml"');
    expect(block).toContain('rel="canonical"');
    expect(block).toContain('/welcome/hello-world"');
    expect(block).toContain('property="og:url"');
  });
});

describe("generateSeoFiles sitemap", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "blog-ssg-seo-test-"));
    process.env.BLOG_PUBLIC_DIR = tempDir;
    process.env.SITE_URL = "https://example.com";
  });

  afterEach(async () => {
    delete process.env.BLOG_PUBLIC_DIR;
    delete process.env.SITE_URL;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("includes lastmod for article urls", async () => {
    const articles: ArticleMeta[] = [
      {
        baseName: "hello-world",
        type: "welcome",
        title: "Hello",
        birthTime: Date.parse("2026-01-01T08:00:00.000Z"),
        ctimeMs: Date.parse("2026-01-01T08:00:00.000Z"),
        updatedTime: Date.parse("2026-06-01T12:00:00.000Z"),
      },
    ];

    await generateSeoFiles(articles);

    const sitemap = await fs.readFile(path.join(tempDir, "sitemap.xml"), "utf-8");
    expect(sitemap).toContain("<lastmod>2026-06-01T12:00:00.000Z</lastmod>");
    expect(sitemap).toContain("/welcome/hello-world</loc>");
  });
});
