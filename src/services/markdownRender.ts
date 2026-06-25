import { Marked } from "marked";
import { createHighlighter, type Highlighter } from "shiki";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface RenderMarkdownResult {
  html: string;
  toc: TocItem[];
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`>#-]/g, "")
    .trim();
}

function slugifyHeading(text: string, used: Map<string, number>) {
  const base = stripInlineMarkdown(text)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const seed = base || "section";
  const count = used.get(seed) ?? 0;
  used.set(seed, count + 1);
  return count === 0 ? seed : `${seed}-${count + 1}`;
}

const LANG_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  json: "JSON",
  markdown: "Markdown",
  md: "Markdown",
  html: "HTML",
  css: "CSS",
  python: "Python",
  py: "Python",
  yaml: "YAML",
  yml: "YAML",
  go: "Go",
  rust: "Rust",
  text: "Plain Text",
  plaintext: "Plain Text",
  txt: "Plain Text",
};

const SHIKI_LANGS = [
  "typescript",
  "javascript",
  "bash",
  "shell",
  "json",
  "markdown",
  "html",
  "css",
  "python",
  "yaml",
  "go",
  "rust",
  "text",
] as const;

const LANG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  md: "markdown",
  py: "python",
  plaintext: "text",
  txt: "text",
};

const CODE_BLOCK_RE =
  /<pre><code(?: class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [...SHIKI_LANGS],
    });
  }
  return highlighterPromise;
}

function normalizeLang(lang?: string) {
  const raw = (lang || "text").trim().toLowerCase();
  return LANG_ALIASES[raw] || raw;
}

function langLabel(lang?: string) {
  const raw = (lang || "text").trim().toLowerCase();
  return LANG_LABELS[raw] || LANG_LABELS[normalizeLang(raw)] || raw;
}

async function highlightCode(code: string, lang?: string) {
  const normalized = normalizeLang(lang);
  const highlighter = await getHighlighter();
  const loaded = highlighter.getLoadedLanguages().includes(normalized)
    ? normalized
    : "text";

  try {
    return highlighter.codeToHtml(code, {
      lang: loaded,
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      defaultColor: false,
    });
  } catch {
    return `<pre class="shiki fallback"><code>${escapeHtml(code)}</code></pre>`;
  }
}

async function renderCodeBlock(code: string, lang?: string) {
  const highlighted = await highlightCode(code, lang);
  const label = langLabel(lang);

  return `<div class="code-block">
<div class="code-block__header">
<span class="code-block__lang">${escapeHtml(label)}</span>
<button type="button" class="code-block__copy" aria-label="复制代码">复制</button>
</div>
<div class="code-block__body">${highlighted}</div>
<textarea class="code-block__source" hidden readonly>${escapeHtml(code)}</textarea>
</div>`;
}

function renderMermaidBlock(code: string) {
  return `<div class="mermaid-diagram">
<pre class="mermaid">${escapeHtml(code.trim())}</pre>
</div>`;
}

function isMermaidLang(lang?: string) {
  return (lang || "").trim().toLowerCase() === "mermaid";
}

function createMarkedRenderer(toc: TocItem[]) {
  const usedIds = new Map<string, number>();

  return {
    heading(this: { parser: { parseInline: (tokens: unknown[]) => string } }, token: {
      tokens: unknown[];
      depth: number;
      text: string;
    }) {
      const { tokens, depth, text } = token;
      const html = this.parser.parseInline(tokens);

      if (depth < 2 || depth > 4) {
        return `<h${depth}>${html}</h${depth}>\n`;
      }

      const plain = stripInlineMarkdown(text);
      const id = slugifyHeading(plain, usedIds);
      toc.push({ id, text: plain, level: depth });
      return `<h${depth} id="${id}">${html}</h${depth}>\n`;
    },
  };
}

interface TocNode {
  item: TocItem;
  children: TocNode[];
}

function buildTocTree(toc: TocItem[]): TocNode[] {
  const root: TocNode[] = [];
  const stack: TocNode[] = [];

  for (const item of toc) {
    const node: TocNode = { item, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].item.level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return root;
}

function renderTocNode(node: TocNode): string {
  const { item, children } = node;
  const childHtml = children.length
    ? `<ul class="article-toc__sublist">${children.map(renderTocNode).join("")}</ul>`
    : "";

  return `<li class="article-toc__item article-toc__item--h${item.level}"><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a>${childHtml}</li>`;
}

function buildNestedTocList(toc: TocItem[]): string {
  return buildTocTree(toc).map(renderTocNode).join("");
}

export function renderTocHtml(toc: TocItem[]) {
  if (toc.length === 0) return "";

  const items = buildNestedTocList(toc);

  return `<nav class="article-toc" aria-label="目录">
<p class="article-toc__label">目录</p>
<details class="article-toc__details" open>
<summary class="article-toc__summary">目录</summary>
<ul class="article-toc__list">${items}</ul>
</details>
</nav>`;
}

export async function renderMarkdown(body: string): Promise<RenderMarkdownResult> {
  const toc: TocItem[] = [];
  const marked = new Marked({
    gfm: true,
    renderer: createMarkedRenderer(toc),
  });

  const html = marked.parse(body) as string;
  const matches = [...html.matchAll(CODE_BLOCK_RE)];
  if (matches.length === 0) {
    return { html, toc };
  }

  const blocks = await Promise.all(
    matches.map(async (match) => {
      const lang = match[1] || "text";
      const code = decodeHtmlEntities(match[2] ?? "");
      if (isMermaidLang(lang)) {
        return renderMermaidBlock(code);
      }
      return renderCodeBlock(code, lang);
    }),
  );

  let cursor = 0;
  let result = "";

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    result += html.slice(cursor, match.index);
    result += blocks[i];
    cursor = match.index! + match[0].length;
  }

  result += html.slice(cursor);
  return { html: result, toc };
}
