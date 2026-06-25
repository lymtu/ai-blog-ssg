import { html, LitElement, unsafeCSS } from "lit";

import ThemeStyleInline from "./toggleThemeBtn.css?inline";
import StyleInline from "./style.css?inline";
import OSSvgInline from "@/assets/img/os.svg?inline";
import SunSvgInline from "@/assets/img/sun.svg?inline";
import MoonSvgInline from "@/assets/img/moon.svg?inline";

class ThemeToggler extends LitElement {
  static properties = { theme: { type: `light` } };
  constructor() {
    super();
    this.theme = localStorage.getItem(`theme`) || `os`;
    this._updateHtmlProperty();
  }
  _toggleTheme(e) {
    switch (this.theme) {
      case `light`:
        this.theme = `dark`;
        break;
      case `dark`:
        this.theme = `os`;
        break;
      case `os`:
        this.theme = `light`;
        break;
    }

    if (this.theme === `os`) {
      localStorage.removeItem(`theme`);
    } else {
      localStorage.setItem(`theme`, this.theme);
    }
    this._updateHtmlProperty(e);
  }
  _updateHtmlProperty(e) {
    let t = () => {
      if (this.theme === `os`) {
        document.documentElement.removeAttribute(`data-theme`);
        return;
      }
      document.documentElement.setAttribute(`data-theme`, this.theme);
    };
    if (document.startViewTransition && e) {
      let n = document.startViewTransition(t),
        r = e.currentTarget.getBoundingClientRect();
      n.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0 at ${r.x + r.width / 2}px ${r.y + r.height / 2}px)`,
              `circle(100% at ${r.x + r.width / 2}px ${r.y + r.height / 2}px)`,
            ],
          },
          { duration: 300, pseudoElement: `::view-transition-new(root)` },
        );
      });
      return;
    }
    t();
  }
  render() {
    return html`
      <button class="toggleBtn" @click=${this._toggleTheme}>
        <img
          src=${this.theme === `light`
            ? SunSvgInline
            : this.theme === `dark`
              ? MoonSvgInline
              : OSSvgInline}
          alt="theme"
        />
      </button>
    `;
  }

  static styles = unsafeCSS(ThemeStyleInline);
}

window.customElements.define(`theme-toggler`, ThemeToggler);

class Header extends LitElement {
  static properties = {
    scrollY: { type: Number },
    translateY: { type: `-110%` },
  };
  constructor() {
    (super(), (this.scrollY = 0), (this.translateY = 0));
  }
  connectedCallback() {
    (super.connectedCallback(),
      window.addEventListener(`scroll`, this._handleScroll));
  }
  disconnectedCallback() {
    (super.disconnectedCallback(),
      window.removeEventListener(`scroll`, this._handleScroll));
  }
  render() {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    return html`
      <header style="translate: 0 ${this.translateY}">
        <a href="/" class="title">Lymtu的博客 </a>
        <div class="header-content">
          <theme-toggler></theme-toggler>
          <div class="spacer"></div>
          <nav class="nav">
            ${[
              { path: `/`, name: `首页` },
              { path: `/about`, name: `关于` },
            ].map(
              (e) =>
                html`<a
                  href="${e.path}"
                  class="${path === e.path ? `active` : ``}"
                  >${e.name}</a
                >`,
            )}
          </nav>
        </div>
      </header>
    `;
  }
  _handleScroll = (e) => {
    window.scrollY > this.scrollY
      ? (this.translateY = `-110%`)
      : (this.translateY = `0`);
    this.scrollY = window.scrollY;
  };
  static styles = unsafeCSS(StyleInline);
}

window.customElements.define("my-header", Header);
