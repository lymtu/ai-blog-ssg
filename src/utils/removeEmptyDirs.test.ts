import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { removeEmptyDirsUpward } from "./removeEmptyDirs";

describe("removeEmptyDirsUpward", () => {
  let tmpRoot = "";

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "blog-ssg-empty-dirs-"));
  });

  afterEach(async () => {
    if (tmpRoot) {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it("removes nested empty directories up to root", async () => {
    const leaf = path.join(tmpRoot, "blog", "2026");
    await fs.mkdir(leaf, { recursive: true });
    await fs.writeFile(path.join(leaf, "post.md"), "# hi", "utf-8");

    await fs.unlink(path.join(leaf, "post.md"));
    await removeEmptyDirsUpward(leaf, tmpRoot);

    await expect(fs.stat(path.join(tmpRoot, "blog", "2026"))).rejects.toThrow();
    await expect(fs.stat(path.join(tmpRoot, "blog"))).rejects.toThrow();
    await expect(fs.stat(tmpRoot)).resolves.toBeDefined();
  });

  it("stops when a sibling file remains in parent directory", async () => {
    const leaf = path.join(tmpRoot, "blog", "2026");
    await fs.mkdir(leaf, { recursive: true });
    await fs.writeFile(path.join(leaf, "a.md"), "a", "utf-8");
    await fs.writeFile(path.join(leaf, "b.md"), "b", "utf-8");

    await fs.unlink(path.join(leaf, "a.md"));
    await removeEmptyDirsUpward(leaf, tmpRoot);

    await expect(fs.stat(path.join(leaf, "b.md"))).resolves.toBeDefined();
    await expect(fs.stat(leaf)).resolves.toBeDefined();
    await expect(fs.stat(path.join(tmpRoot, "blog"))).resolves.toBeDefined();
  });

  it("does not remove the root directory", async () => {
    await removeEmptyDirsUpward(tmpRoot, tmpRoot);
    await expect(fs.stat(tmpRoot)).resolves.toBeDefined();
  });
});
