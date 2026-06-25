import mermaid from "mermaid";

function resolveMermaidTheme() {
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "dark") return "dark";
  if (theme === "light") return "default";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "default";
}

let initialized = false;

function ensureMermaidConfig() {
  mermaid.initialize({
    startOnLoad: false,
    theme: resolveMermaidTheme(),
    securityLevel: "strict",
    fontFamily: "inherit",
  });
  initialized = true;
}

export async function initMermaidDiagrams(root = document) {
  const nodes = root.querySelectorAll(".mermaid-diagram pre.mermaid");
  if (nodes.length === 0) return;

  if (!initialized) {
    ensureMermaidConfig();
  } else {
    mermaid.initialize({
      startOnLoad: false,
      theme: resolveMermaidTheme(),
      securityLevel: "strict",
      fontFamily: "inherit",
    });
  }

  await mermaid.run({ nodes });
}

window.initMermaidDiagrams = initMermaidDiagrams;

const articleContent = document.querySelector(".article-page .article-content");
if (articleContent) {
  initMermaidDiagrams(articleContent).catch(() => {});
}
