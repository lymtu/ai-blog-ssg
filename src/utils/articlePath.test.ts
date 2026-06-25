import { describe, expect, it } from "bun:test";
import {
  buildArchivePath,
  buildArticlePath,
  parseArticlePath,
  parseViewApiPath,
} from "./articlePath";

describe("parseArticlePath", () => {
  it("parses multi-level category paths", () => {
    expect(parseArticlePath("demo/sub/my-post")).toEqual({
      category: "demo/sub",
      slug: "my-post",
    });
  });

  it("parses single-level category paths", () => {
    expect(parseArticlePath("welcome/hello-world")).toEqual({
      category: "welcome",
      slug: "hello-world",
    });
  });

  it("returns null for single segment paths", () => {
    expect(parseArticlePath("only-one")).toBeNull();
  });

  it("returns null for empty paths", () => {
    expect(parseArticlePath("")).toBeNull();
    expect(parseArticlePath("/")).toBeNull();
  });
});

describe("buildArticlePath", () => {
  it("builds nested article urls", () => {
    expect(buildArticlePath("blog/2026", "test-post")).toBe(
      "/blog/2026/test-post",
    );
  });
});

describe("buildArchivePath", () => {
  it("builds nested archive urls", () => {
    expect(buildArchivePath("demo/sub")).toBe("/archive/demo/sub");
  });
});

describe("parseViewApiPath", () => {
  it("parses nested view api paths", () => {
    expect(parseViewApiPath("demo/sub/my-post/view")).toEqual({
      category: "demo/sub",
      slug: "my-post",
    });
  });

  it("returns null when suffix is missing", () => {
    expect(parseViewApiPath("demo/sub/my-post")).toBeNull();
  });
});
