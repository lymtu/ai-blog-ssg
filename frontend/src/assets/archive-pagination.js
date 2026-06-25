import {
  PAGE_SIZE,
  readPageFromUrl,
  writePageToUrl,
} from "@/utils/paginationUrl.js";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRow(item) {
  return `<li>
  <a href="${escapeHtml(item.href)}">
    <span class="dir">[ ${escapeHtml(item.category)} ]</span>
    <span class="basename">${escapeHtml(item.title)}</span>
    <span class="birthtime">${escapeHtml(item.date)}</span>
    <span class="views">${item.views} 次阅读</span>
    <div class="arrow">
      <img class="light" src="/arrow-left-up.svg" alt="" />
      <img class="dark" src="/arrow-left-up-light.svg" alt="" />
    </div>
  </a>
</li>`;
}

function renderPagination(currentPage, totalPages) {
  return `
    <button type="button" class="archive-pagination__btn" data-action="prev" aria-label="上一页" ${currentPage <= 1 ? "disabled" : ""}>
      <span class="archive-pagination__icon" aria-hidden="true">←</span>
      <span>上一页</span>
    </button>
    <span class="archive-pagination__info" aria-live="polite">
      第 <span class="archive-pagination__current">${currentPage}</span> / ${totalPages} 页
    </span>
    <button type="button" class="archive-pagination__btn" data-action="next" aria-label="下一页" ${currentPage >= totalPages ? "disabled" : ""}>
      <span>下一页</span>
      <span class="archive-pagination__icon" aria-hidden="true">→</span>
    </button>
  `;
}

function initArchivePagination() {
  const dataEl = document.getElementById("archive-data");
  const listEl = document.querySelector(".archive-list");
  const navEl = document.querySelector(".archive-pagination");
  if (!dataEl || !listEl || !navEl) return;

  let articles;
  try {
    articles = JSON.parse(dataEl.textContent || "[]");
  } catch {
    return;
  }

  if (!Array.isArray(articles) || articles.length === 0) return;

  if (articles.length <= PAGE_SIZE) {
    navEl.hidden = true;
    return;
  }

  let currentPage = readPageFromUrl(1);

  const totalPages = () => Math.max(1, Math.ceil(articles.length / PAGE_SIZE));

  const renderPage = ({ replaceUrl = false } = {}) => {
    const total = totalPages();
    currentPage = Math.min(Math.max(1, currentPage), total);
    writePageToUrl(currentPage, { replace: replaceUrl });

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = articles.slice(start, start + PAGE_SIZE);
    listEl.innerHTML = pageItems.map(renderRow).join("\n");
    navEl.innerHTML = renderPagination(currentPage, total);
  };

  navEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled) return;

    if (button.dataset.action === "prev") {
      currentPage -= 1;
    } else if (button.dataset.action === "next") {
      currentPage += 1;
    }

    renderPage();
    listEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  window.addEventListener("popstate", () => {
    currentPage = readPageFromUrl(1);
    renderPage({ replaceUrl: true });
  });

  navEl.hidden = false;
  renderPage({ replaceUrl: true });
}

initArchivePagination();
