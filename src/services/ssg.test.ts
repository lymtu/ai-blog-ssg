import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { cleanupOrphanArticleHtml, type ArticleMeta } from "./ssg";

describe("cleanupOrphanArticleHtml", () => {
  let tempDir: string;
  let publicDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "blog-ssg-ssg-test-"));
    publicDir = path.join(tempDir, "public");
    process.env.BLOG_PUBLIC_DIR = publicDir;
    process.env.BLOG_MARKDOWN_DIR = path.join(tempDir, "markdown");

    await fs.mkdir(path.join(publicDir, "welcome"), { recursive: true });
    await fs.mkdir(path.join(publicDir, "archive"), { recursive: true });
    await fs.writeFile(path.join(publicDir, "index.html"), "<html></html>", "utf-8");
    await fs.writeFile(
      path.join(publicDir, "welcome", "keep-me.html"),
      "<html></html>",
      "utf-8",
    );
    await fs.writeFile(
      path.join(publicDir, "welcome", "orphan.html"),
      "<html></html>",
      "utf-8",
    );
    await fs.writeFile(
      path.join(publicDir, "archive", "demo.html"),
      "<html></html>",
      "utf-8",
    );
  });

  afterEach(async () => {
    delete process.env.BLOG_PUBLIC_DIR;
    delete process.env.BLOG_MARKDOWN_DIR;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("removes article HTML without a matching markdown entry", async () => {
    const articles: ArticleMeta[] = [
      {
        baseName: "keep-me",
        type: "welcome",
        title: "Keep Me",
        birthTime: Date.now(),
        ctimeMs: Date.now(),
      },
    ];

    await cleanupOrphanArticleHtml(articles);

    expect(await fs.stat(path.join(publicDir, "welcome", "keep-me.html"))).toBeDefined();
    await expect(fs.stat(path.join(publicDir, "welcome", "orphan.html"))).rejects.toThrow();
    expect(await fs.stat(path.join(publicDir, "index.html"))).toBeDefined();
    expect(await fs.stat(path.join(publicDir, "archive", "demo.html"))).toBeDefined();
  });
});
