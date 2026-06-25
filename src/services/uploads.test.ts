import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { isImageUploadFilename, listUploads } from "./uploads";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function withUploadsDir(run: (uploadsDir: string) => Promise<void>) {
  const uploadsDir = await fs.mkdtemp(path.join(os.tmpdir(), "blog-uploads-"));
  tempDirs.push(uploadsDir);
  const previous = process.env.BLOG_PUBLIC_DIR;
  process.env.BLOG_PUBLIC_DIR = path.join(uploadsDir, "public");
  await fs.mkdir(path.join(process.env.BLOG_PUBLIC_DIR, "assets", "uploads"), {
    recursive: true,
  });

  try {
    await run(path.join(process.env.BLOG_PUBLIC_DIR, "assets", "uploads"));
  } finally {
    if (previous === undefined) delete process.env.BLOG_PUBLIC_DIR;
    else process.env.BLOG_PUBLIC_DIR = previous;
  }
}

describe("isImageUploadFilename", () => {
  it("accepts supported image extensions", () => {
    expect(isImageUploadFilename("photo.jpg")).toBe(true);
    expect(isImageUploadFilename("cover.webp")).toBe(true);
  });

  it("rejects hidden and non-image files", () => {
    expect(isImageUploadFilename(".gitkeep")).toBe(false);
    expect(isImageUploadFilename("notes.txt")).toBe(false);
  });
});

describe("listUploads", () => {
  it("ignores placeholder and non-image files", async () => {
    await withUploadsDir(async (uploadsDir) => {
      await fs.writeFile(path.join(uploadsDir, ".gitkeep"), "");
      await fs.writeFile(path.join(uploadsDir, "readme.txt"), "x");
      await fs.writeFile(path.join(uploadsDir, "cover.png"), Buffer.from("png"));

      const items = await listUploads();
      expect(items.map((item) => item.name)).toEqual(["cover.png"]);
    });
  });
});
