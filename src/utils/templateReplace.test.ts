import { describe, expect, it } from "bun:test";
import { applyTemplateTokens, replaceTemplateToken } from "./templateReplace";

describe("replaceTemplateToken", () => {
  it("preserves dollar-sign replacement patterns in values", () => {
    const template = "<article>{{content}}</article>";
    const content = "await client.json.set('user:id_1', '$', {});";

    expect(replaceTemplateToken(template, "{{content}}", content)).toBe(
      `<article>${content}</article>`,
    );
  });

  it("preserves template literals from code samples", () => {
    const template = "{{content}}";
    const content = "console.log(`${result.age} - ${result.count}`);";

    expect(replaceTemplateToken(template, "{{content}}", content)).toBe(
      content,
    );
  });
});

describe("applyTemplateTokens", () => {
  it("replaces multiple tokens without interpreting dollar sequences", () => {
    const html = applyTemplateTokens("<h1>{{title}}</h1><div>{{content}}</div>", {
      "{{title}}": "Redis $ notes",
      "{{content}}": "path '$'",
    });

    expect(html).toBe("<h1>Redis $ notes</h1><div>path '$'</div>");
  });
});
