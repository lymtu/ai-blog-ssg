import { describe, expect, it } from "bun:test";
import { renderMarkdown } from "./markdownRender";

describe("renderMarkdown mermaid", () => {
  it("renders ```mermaid blocks as client-side diagram containers", async () => {
    const { html } = await renderMarkdown(`## Diagram

\`\`\`mermaid
graph TD
  A[Markdown] --> B[HTML]
  B --> C[Mermaid SVG]
\`\`\`
`);

    expect(html).toContain('class="mermaid-diagram"');
    expect(html).toContain('class="mermaid"');
    expect(html).toContain("graph TD");
    expect(html).not.toContain("code-block");
    expect(html).not.toContain("shiki");
  });

  it("still highlights normal code blocks", async () => {
    const { html } = await renderMarkdown(`\`\`\`ts
const ok = true;
\`\`\`
`);

    expect(html).toContain('class="code-block"');
    expect(html).not.toContain("mermaid-diagram");
  });
});
