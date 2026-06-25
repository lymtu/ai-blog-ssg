const el = document.querySelector(".article-views[data-category][data-slug]");
if (el) {
  const { category, slug } = el.dataset;
  const path = [category, slug]
    .filter(Boolean)
    .join("/")
    .replace(/^\/+|\/+$/g, "");
  fetch(`/api/posts/${path}/view`, { method: "POST", credentials: "include" })
    .then((res) => (res.ok ? res.json() : Promise.reject()))
    .then(({ views }) => {
      el.textContent = `阅读 ${views} 次`;
    })
    .catch(() => {});
}
