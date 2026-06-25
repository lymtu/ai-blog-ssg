const tocLinks = [...document.querySelectorAll(".article-toc__item a[href^='#']")];
if (tocLinks.length === 0) {
  // no toc on this page
} else {
  const headings = tocLinks
    .map((link) => {
      const id = link.getAttribute("href")?.slice(1);
      if (!id) return null;
      const el = document.getElementById(id);
      return el ? { link, el } : null;
    })
    .filter(Boolean);

  let activeLink = null;

  function setActive(link) {
    if (activeLink === link) return;
    tocLinks.forEach((item) => item.classList.remove("is-active"));
    link?.classList.add("is-active");
    activeLink = link;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (!visible.length) return;

      const match = headings.find((item) => item.el === visible[0].target);
      if (match) setActive(match.link);
    },
    { rootMargin: "-18% 0px -62% 0px", threshold: [0, 0.25, 0.6, 1] },
  );

  for (const item of headings) {
    observer.observe(item.el);
  }

  if (headings[0]) {
    setActive(headings[0].link);
  }
}
