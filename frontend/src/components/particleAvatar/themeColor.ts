export function getParticleTintColor(): string {
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue("--particle-color")
    .trim();
  if (color) return color;

  const theme = document.documentElement.getAttribute("data-theme");
  if (theme === "dark") return "#8e8e93";
  if (theme === "light") return "#48484a";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "#8e8e93"
    : "#48484a";
}

export function watchParticleTintColor(onChange: (color: string) => void) {
  const notify = () => onChange(getParticleTintColor());

  const themeObserver = new MutationObserver(notify);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  colorSchemeQuery.addEventListener("change", notify);

  return () => {
    themeObserver.disconnect();
    colorSchemeQuery.removeEventListener("change", notify);
  };
}
