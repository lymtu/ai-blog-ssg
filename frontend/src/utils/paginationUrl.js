export const PAGE_SIZE = 20;

export function readPageFromUrl(defaultPage = 1) {
  const raw = new URLSearchParams(window.location.search).get("page");
  if (!raw) return defaultPage;
  const page = Number.parseInt(raw, 10);
  return Number.isFinite(page) && page > 0 ? page : defaultPage;
}

export function writePageToUrl(page, { replace = false } = {}) {
  const url = new URL(window.location.href);
  if (page <= 1) {
    url.searchParams.delete("page");
  } else {
    url.searchParams.set("page", String(page));
  }

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;

  const state = { page: Math.max(1, page) };
  if (replace) {
    history.replaceState(state, "", next);
  } else {
    history.pushState(state, "", next);
  }
}
