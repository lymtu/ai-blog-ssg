for (const btn of document.querySelectorAll(".code-block__copy")) {
  btn.addEventListener("click", async () => {
    const block = btn.closest(".code-block");
    const source = block?.querySelector(".code-block__source");
    if (!source) return;

    const reset = () => {
      btn.textContent = "复制";
      btn.classList.remove("is-copied");
    };

    try {
      await navigator.clipboard.writeText(source.value);
    } catch {
      source.removeAttribute("hidden");
      source.select();
      document.execCommand("copy");
      source.setAttribute("hidden", "");
    }

    btn.textContent = "已复制";
    btn.classList.add("is-copied");
    window.setTimeout(reset, 2000);
  });
}
