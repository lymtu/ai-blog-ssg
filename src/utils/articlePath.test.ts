import { describe, expect, it } from "bun:test";
import {
  buildAdminPostApiPath,
  buildArchivePath,
  buildArticlePath,
  buildViewApiPath,
  decodeRoutePath,
  parseArticlePath,
  parseViewApiPath,
} from "./articlePath";

describe("decodeRoutePath", () => {
  it("decodes percent-encoded path segments", () => {
    expect(decodeRoutePath("%E6%9D%82%E9%A1%B9/%E5%BA%8F")).toBe("杂项/序");
  });
});

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

  it("parses percent-encoded chinese paths", () => {
    expect(parseArticlePath("%E6%9D%82%E9%A1%B9/%E5%BA%8F")).toEqual({
      category: "杂项",
      slug: "序",
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

  it("encodes chinese path segments", () => {
    expect(buildArticlePath("杂项", "序")).toBe(
      "/%E6%9D%82%E9%A1%B9/%E5%BA%8F",
    );
  });
});

describe("buildArchivePath", () => {
  it("builds nested archive urls", () => {
    expect(buildArchivePath("demo/sub")).toBe("/archive/demo/sub");
  });

  it("encodes chinese archive paths", () => {
    expect(buildArchivePath("杂项")).toBe("/archive/%E6%9D%82%E9%A1%B9");
  });
});

describe("buildAdminPostApiPath", () => {
  it("encodes chinese api paths", () => {
    expect(buildAdminPostApiPath("杂项", "序")).toBe(
      "/api/admin/posts/%E6%9D%82%E9%A1%B9/%E5%BA%8F",
    );
  });
});

describe("parseViewApiPath", () => {
  it("parses nested view api paths", () => {
    expect(parseViewApiPath("demo/sub/my-post/view")).toEqual({
      category: "demo/sub",
      slug: "my-post",
    });
  });

  it("parses encoded chinese view api paths", () => {
    expect(parseViewApiPath("%E6%9D%82%E9%A1%B9/%E5%BA%8F/view")).toEqual({
      category: "杂项",
      slug: "序",
    });
  });

  it("returns null when suffix is missing", () => {
    expect(parseViewApiPath("demo/sub/my-post")).toBeNull();
  });
});

describe("buildViewApiPath", () => {
  it("encodes chinese view api paths", () => {
    expect(buildViewApiPath("杂项", "序")).toBe(
      "/api/posts/%E6%9D%82%E9%A1%B9/%E5%BA%8F/view",
    );
  });
});
