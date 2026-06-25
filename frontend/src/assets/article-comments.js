const GISCUS = {
  repo: "lymtu/ai-blog-ssg",
  repoId: "R_kgDOTE6Mdw",
  category: "Announcements",
  categoryId: "DIC_kwDOTE6Md84C_3dM",
  mapping: "pathname",
  strict: "0",
  reactionsEnabled: "1",
  emitMetadata: "0",
  inputPosition: "top",
  lang: "zh-CN",
};

function resolveGiscusTheme() {
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "dark") return "dark_tritanopia";
  if (theme === "light") return "light_tritanopia";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark_tritanopia"
    : "light_tritanopia";
}

function sendGiscusTheme(theme) {
  const iframe = document.querySelector("iframe.giscus-frame");
  if (!iframe?.contentWindow) return;
  iframe.contentWindow.postMessage(
    { giscus: { setConfig: { theme } } },
    "https://giscus.app",
  );
}

function removeGiscusScript() {
  document.querySelector('script[src="https://giscus.app/client.js"]')?.remove();
}

function mountGiscus() {
  const container = document.querySelector(".giscus");
  if (!container) return;

  removeGiscusScript();
  container.replaceChildren();

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-repo", GISCUS.repo);
  script.setAttribute("data-repo-id", GISCUS.repoId);
  script.setAttribute("data-category", GISCUS.category);
  script.setAttribute("data-category-id", GISCUS.categoryId);
  script.setAttribute("data-mapping", GISCUS.mapping);
  script.setAttribute("data-strict", GISCUS.strict);
  script.setAttribute("data-reactions-enabled", GISCUS.reactionsEnabled);
  script.setAttribute("data-emit-metadata", GISCUS.emitMetadata);
  script.setAttribute("data-input-position", GISCUS.inputPosition);
  script.setAttribute("data-theme", resolveGiscusTheme());
  script.setAttribute("data-lang", GISCUS.lang);
  container.append(script);
}

function watchThemeChanges() {
  let currentTheme = resolveGiscusTheme();

  const applyTheme = () => {
    const next = resolveGiscusTheme();
    if (next === currentTheme) return;
    currentTheme = next;
    sendGiscusTheme(next);
  };

  const observer = new MutationObserver(applyTheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", applyTheme);
}

const container = document.querySelector(".article-comments .giscus");
if (container) {
  // 等布局完成后再挂载，避免 Giscus 按错误容器宽度初始化 iframe
  requestAnimationFrame(() => {
    mountGiscus();
    watchThemeChanges();
  });
}
