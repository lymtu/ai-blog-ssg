import { LitElement, html, render, nothing, unsafeCSS } from "lit";
import {
  timeTransform,
  getShanghaiYear,
  getShanghaiDayIndex,
  getCalendarWeekday,
  getYearStartInShanghai,
  getDatePartsInShanghai,
  getRollingTailLen,
} from "@/utils/timeTransform.js";
import {
  readPageFromUrl,
  writePageToUrl,
} from "@/utils/paginationUrl.js";

import StyleInline from "./style.css?inline";
import FormStyleInline from "./form.css?inline";
import MdListStyleInline from "@/assets/style/mdList.css?inline";

const MS_DAY = 86400000;
const PAGE_SIZE = 20;
const YEAR_CELL_COUNT = 371;
const GAP_PX = 2;
const MIN_CELL_PX = 4;
const TOOLTIP_HIDE_DELAY_MS = 120;

const SEARCH_ICON_LIGHT = `data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='UTF-8'?%3e%3csvg%20width='24'%20height='24'%20viewBox='0%200%2048%2048'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M21%2038C30.3888%2038%2038%2030.3888%2038%2021C38%2011.6112%2030.3888%204%2021%204C11.6112%204%204%2011.6112%204%2021C4%2030.3888%2011.6112%2038%2021%2038Z'%20fill='none'%20stroke='%23000000'%20stroke-width='4'%20stroke-linejoin='round'/%3e%3cpath%20d='M26.657%2014.3431C25.2093%2012.8954%2023.2093%2012%2021.0001%2012C18.791%2012%2016.791%2012.8954%2015.3433%2014.3431'%20stroke='%23000000'%20stroke-width='4'%20stroke-linecap='round'%20stroke-linejoin='round'/%3e%3cpath%20d='M33.2216%2033.2217L41.7069%2041.707'%20stroke='%23000000'%20stroke-width='4'%20stroke-linecap='round'%20stroke-linejoin='round'/%3e%3c/svg%3e`;
const SEARCH_ICON_DARK = `data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='UTF-8'?%3e%3csvg%20width='24'%20height='24'%20viewBox='0%200%2048%2048'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M21%2038C30.3888%2038%2038%2030.3888%2038%2021C38%2011.6112%2030.3888%204%2021%204C11.6112%204%204%2011.6112%204%2021C4%2030.3888%2011.6112%2038%2021%2038Z'%20fill='none'%20stroke='%23ffffff'%20stroke-width='4'%20stroke-linejoin='round'/%3e%3cpath%20d='M26.657%2014.3431C25.2093%2012.8954%2023.2093%2012%2021.0001%2012C18.791%2012%2016.791%2012.8954%2015.3433%2014.3431'%20stroke='%23ffffff'%20stroke-width='4'%20stroke-linecap='round'%20stroke-linejoin='round'/%3e%3cpath%20d='M33.2216%2033.2217L41.7069%2041.707'%20stroke='%23ffffff'%20stroke-width='4'%20stroke-linecap='round'%20stroke-linejoin='round'/%3e%3c/svg%3e`;

function dedupeMonthLabels(labels) {
  const seen = new Set();
  return labels.filter(({ column }) => {
    if (seen.has(column)) return false;
    seen.add(column);
    return true;
  });
}

function formatTooltipDate(timestamp) {
  return timeTransform(timestamp, "yyyy/MM/dd");
}

class ArchiveList extends LitElement {
  static properties = {
    viewList: { type: Array },
    fullList: { type: Array },
    yearList: { type: Array },
    monthLabels: { type: Array },
    activeYear: { type: Number },
    yearClassResult: { type: Object },
    gridColumns: { type: Number },
    searchQuery: { type: String },
    dayFilter: { type: Array },
    selectedCellIndex: { type: Number },
    currentPage: { type: Number },
    pageSize: { type: Number },
    _ready: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this.yearClassResult = {};
    this.yearInfo = {};
    this.yearCellDates = {};
    this.viewList = [];
    this.fullList = [];
    this.yearList = [];
    this.monthLabels = [];
    this.gridColumns = 0;
    this.activeYear = getShanghaiYear(Date.now());
    this.searchQuery = "";
    this.dayFilter = null;
    this.selectedCellIndex = null;
    this.currentPage = 1;
    this.pageSize = PAGE_SIZE;
    this._ready = false;

    this._chartHost = null;
    this._resizeObserver = null;
    this._tooltipHideTimer = null;

    this._onSearchInput = this._onSearchInput.bind(this);
    this._onSearchSubmit = this._onSearchSubmit.bind(this);
    this._onCellEnter = this._onCellEnter.bind(this);
    this._onCellMove = this._onCellMove.bind(this);
    this._onCellLeave = this._onCellLeave.bind(this);
    this._applyCellSize = this._applyCellSize.bind(this);
    this._onViewportChange = this._onViewportChange.bind(this);
    this._onPopState = this._onPopState.bind(this);
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.replaceChildren();
    window.addEventListener("resize", this._onViewportChange);
    window.addEventListener("popstate", this._onPopState);
    this._loadFromPage();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this._onViewportChange);
    window.removeEventListener("popstate", this._onPopState);
    this._cancelHideTooltip();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
  }

  updated() {
    if (!this._ready) return;

    const host = this.querySelector(".activity-container");
    if (host && (host !== this._chartHost || !host.querySelector(".grid-container"))) {
      this._chartHost = host;
      this._renderChart();
    }

    this._syncCategoryMarquee();
  }

  render() {
    if (!this._ready) {
      return html`<div class="archive-loading">加载中…</div>`;
    }

    return html`
      <div>
        <div class="activity-container"></div>

        <header class="archive-header">
          <h2>归档</h2>
        </header>

        ${this.dayFilter
          ? html`<button class="clear-filter" @click=${() => this._clearDayFilter()}>
              清除日期筛选
            </button>`
          : nothing}

        <div class="control-panel">
          <form @submit=${this._onSearchSubmit}>
            <input
              type="text"
              placeholder="搜索"
              .value=${this.searchQuery}
              @input=${this._onSearchInput}
            />
            <button type="submit">
              <img class="light" src="${SEARCH_ICON_LIGHT}" alt="search" />
              <img class="dark" src="${SEARCH_ICON_DARK}" alt="search" />
            </button>
          </form>
        </div>

        ${this._categoryTagsTemplate()}

        <ul class="list">${this._listTemplate()}</ul>
        ${this._paginationTemplate()}
      </div>
    `;
  }

  async _loadFromPage() {
    const dataEl = document.getElementById("site-md-info");
    const raw = dataEl?.textContent?.trim() ?? "";

    if (!raw || raw.startsWith("<!--")) {
      this._ready = true;
      return;
    }

    try {
      const list = JSON.parse(raw);
      this.fullList = Array.isArray(list) ? list : [];
      this.currentPage = readPageFromUrl(1);
      this._initGrid(this.fullList);
      this._applyFilters();
      writePageToUrl(this.currentPage, { replace: true });
      this._ready = true;
      await this._fetchViews();
    } catch {
      this.fullList = [];
      this.viewList = [];
      this._ready = true;
    }
  }

  async _fetchViews() {
    try {
      const res = await fetch("/api/posts/views");
      if (!res.ok) return;
      const views = await res.json();
      if (!views || typeof views !== "object") return;

      this.fullList = this.fullList.map((item) => ({
        ...item,
        views: views[`${item.type}/${item.baseName}`] ?? item.views ?? 0,
      }));
      this._applyFilters();
    } catch {
      // ignore
    }
  }

  _categoryTags() {
    const tags = new Set();
    this.viewList.forEach((item) => {
      if (!item.type) return;
      tags.add(item.type);
      item.type.split("/").reduce((acc, part) => {
        const path = acc ? `${acc}/${part}` : part;
        tags.add(path);
        return path;
      }, "");
    });
    return [...tags].sort();
  }

  _buildMarqueeStrip(tags) {
    if (!tags.length) return [];
    const strip = [...tags];
    while (strip.length < 8) {
      strip.push(...tags);
    }
    return strip;
  }

  _categoryTagLinks(tags) {
    return tags.map(
      (tag) => html`<a class="category-tag" href=${this._buildArchivePath(tag)}
        >[ ${tag} ]</a
      >`,
    );
  }

  _categoryTagsTemplate() {
    const tags = this._categoryTags();
    if (!tags.length) return nothing;

    const strip = this._buildMarqueeStrip(tags);
    const groupCount = 4;

    return html`<nav class="category-marquee" aria-label="分类">
      <div
        class="category-marquee__track"
        style="--marquee-group-count: ${groupCount}"
      >
        ${Array.from(
          { length: groupCount },
          (_, index) => html`
            <div class="category-marquee__group" ?aria-hidden=${index > 0}>
              ${this._categoryTagLinks(strip)}
            </div>
          `,
        )}
      </div>
    </nav>`;
  }

  _syncCategoryMarquee() {
    const marquee = this.querySelector(".category-marquee");
    const track = marquee?.querySelector(".category-marquee__track");
    const group = track?.querySelector(".category-marquee__group");
    if (!marquee || !track || !group) return;

    const groupWidth = group.getBoundingClientRect().width;
    if (groupWidth <= 0) return;

    const groupCount = Number(
      getComputedStyle(track).getPropertyValue("--marquee-group-count").trim(),
    ) || 4;
    const speedPxPerSec = 42;
    const duration = Math.max(16, (groupWidth * groupCount) / speedPxPerSec);

    track.style.setProperty("--marquee-duration", `${duration}s`);
  }

  _onPopState() {
    if (!this._ready) return;
    this.currentPage = readPageFromUrl(1);
    if (this.currentPage > this._totalPages()) {
      this.currentPage = this._totalPages();
      writePageToUrl(this.currentPage, { replace: true });
    }
    this.requestUpdate();
  }

  _onViewportChange() {
    if (!this._ready) return;
    this._syncCategoryMarquee();
  }

  _onSearchInput(event) {
    this.searchQuery = event.target.value;
    this._resetPage();
    this._applyFilters();
  }

  _onSearchSubmit(event) {
    event.preventDefault();
    this._resetPage();
    this._applyFilters();
  }

  _buildArchivePath(category) {
    const normalized = String(category || "")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\\/g, "/");
    return `/archive/${normalized}`;
  }

  _totalPages() {
    return Math.max(1, Math.ceil(this.viewList.length / this.pageSize));
  }

  _paginatedList() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.viewList.slice(start, start + this.pageSize);
  }

  _resetPage() {
    this.currentPage = 1;
    writePageToUrl(1, { replace: true });
  }

  _goToPage(page, { replace = false } = {}) {
    const total = this._totalPages();
    const next = Math.min(Math.max(1, page), total);
    if (next === this.currentPage) return;
    this.currentPage = next;
    writePageToUrl(next, { replace });
  }

  _handlePageChange(page) {
    this._goToPage(page);
    this.querySelector(".list")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  _paginationTemplate() {
    const total = this._totalPages();
    if (this.viewList.length <= this.pageSize) return nothing;

    return html`<nav class="archive-pagination" aria-label="归档分页">
      <button
        type="button"
        class="archive-pagination__btn"
        ?disabled=${this.currentPage <= 1}
        aria-label="上一页"
        @click=${() => this._handlePageChange(this.currentPage - 1)}
      >
        <span class="archive-pagination__icon" aria-hidden="true">←</span>
        <span>上一页</span>
      </button>
      <span class="archive-pagination__info" aria-live="polite">
        第
        <span class="archive-pagination__current">${this.currentPage}</span>
        / ${total} 页
      </span>
      <button
        type="button"
        class="archive-pagination__btn"
        ?disabled=${this.currentPage >= total}
        aria-label="下一页"
        @click=${() => this._handlePageChange(this.currentPage + 1)}
      >
        <span>下一页</span>
        <span class="archive-pagination__icon" aria-hidden="true">→</span>
      </button>
    </nav>`;
  }

  _listTemplate() {
    if (this.viewList.length === 0) {
      return html`<li class="empty">暂无文章</li>`;
    }

    return this._paginatedList().map(
      (item) => html`<li>
        <a href="/${item.type}/${item.baseName}" class="post-row">
          <span class="dir-wrap">
            <span
              class="dir"
              role="link"
              tabindex="0"
              @click=${(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.location.href = this._buildArchivePath(item.type);
              }}
              @keydown=${(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  window.location.href = this._buildArchivePath(item.type);
                }
              }}
              >[ ${item.type} ]</span
            >
          </span>
          <span class="basename">${item.title || item.baseName}</span>
          <span class="birthtime">${timeTransform(item.birthTime)}</span>
          <span class="views">${item.views ?? 0} 次阅读</span>
          <div class="arrow">
            <img class="light" src="/arrow-left-up.svg" alt="" />
            <img class="dark" src="/arrow-left-up-light.svg" alt="" />
          </div>
        </a>
      </li>`,
    );
  }

  _syncGridDisplay(year) {
    const cells = this.yearClassResult[year] || [];
    const columns = Math.ceil(cells.length / 7);
    const today = getDatePartsInShanghai(Date.now());
    const currentYear = today.y;
    const currentMonth = today.M;

    this.gridColumns = columns;
    const rawLabels =
      year === currentYear
        ? Array(12)
            .fill(0)
            .map((_, index) => ({
              month: ((index + currentMonth) % 12) + 1,
              column:
                columns <= 1 ? 0 : Math.round((index / 11) * (columns - 1)),
            }))
        : Array(12)
            .fill(0)
            .map((_, index) => ({
              month: index + 1,
              column:
                columns <= 1 ? 0 : Math.round((index / 11) * (columns - 1)),
            }));
    this.monthLabels = dedupeMonthLabels(rawLabels);
  }

  _initGrid(articleList) {
    this.yearClassResult = {};
    this.yearList = [];
    this.yearInfo = {};
    this.yearCellDates = {};

    const now = Date.now();
    const today = getDatePartsInShanghai(now);
    const currentYear = today.y;

    const minYear = articleList.length
      ? Math.min(
          ...articleList.map((article) => getShanghaiYear(article.birthTime)),
        )
      : currentYear;
    const maxYear = articleList.length
      ? Math.max(
          currentYear,
          ...articleList.map((article) => getShanghaiYear(article.birthTime)),
        )
      : currentYear;

    this.activeYear = maxYear;

    const yearInfo = {};

    for (let year = maxYear; year >= minYear; year--) {
      this.yearList.push(year);

      const firstDayTimestamp = getYearStartInShanghai(year);
      const firstDayOfWeek = getCalendarWeekday(year, 1, 1);
      const isRollingCurrentYear = year === maxYear && year === currentYear;

      yearInfo[year] = {
        firstDayTimestamp,
        firstDayOfWeek,
        tailLen: 0,
      };

      if (isRollingCurrentYear) {
        const currentDayOffset = getShanghaiDayIndex(now, year);
        const tailLen = getRollingTailLen(currentDayOffset, firstDayOfWeek);
        const mainLen = currentDayOffset + firstDayOfWeek + 1;

        yearInfo[year].tailLen = tailLen;
        this.yearClassResult[year] = [
          ...Array(tailLen).fill(null),
          ...Array(mainLen).fill(null),
        ];
      } else {
        this.yearClassResult[year] = Array(YEAR_CELL_COUNT).fill(null);
      }
    }

    articleList.forEach((article) => {
      const year = getShanghaiYear(article.birthTime);
      const { firstDayOfWeek, tailLen = 0 } = yearInfo[year];
      const dayIndex = getShanghaiDayIndex(article.birthTime, year);
      const cellIndex = tailLen + dayIndex + firstDayOfWeek;

      if (cellIndex < 0 || cellIndex >= this.yearClassResult[year].length) {
        return;
      }

      this.yearClassResult[year][cellIndex] = [
        ...(this.yearClassResult[year][cellIndex] || []),
        article,
      ];
    });

    this.yearInfo = yearInfo;
    for (const year of this.yearList) {
      this.yearCellDates[year] = this._buildCellDates(year);
    }

    this._syncGridDisplay(this.activeYear);
  }

  _buildCellDates(year) {
    const cells = this.yearClassResult[year] || [];
    const { firstDayTimestamp, firstDayOfWeek, tailLen = 0 } =
      this.yearInfo[year];

    return cells.map((_, index) => {
      const dayOffset = index - tailLen - firstDayOfWeek;
      return firstDayTimestamp + dayOffset * MS_DAY;
    });
  }

  _cellTooltipText(year, index) {
    const cell = this.yearClassResult[year]?.[index];
    const count = cell?.length ?? 0;
    const timestamp = this.yearCellDates[year]?.[index];
    if (timestamp == null) return null;
    return `${formatTooltipDate(timestamp)} · ${count} 篇`;
  }

  _updateActiveYear(year) {
    this.activeYear = year;
    this.dayFilter = null;
    this.selectedCellIndex = null;
    this.searchQuery = "";
    this._resetPage();
    this._hideTooltip();
    this._syncGridDisplay(year);
    this._applyFilters();
    this._renderChart();
  }

  _updateViewList(year, index) {
    this.selectedCellIndex = index;
    this.dayFilter = this.yearClassResult[year][index] || [];
    this._resetPage();
    this._applyFilters();
    this._renderChart();
  }

  _applyFilters() {
    let list = this.dayFilter ?? this.fullList;

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.baseName.toLowerCase().includes(q) ||
          (item.title && item.title.toLowerCase().includes(q)) ||
          item.type.toLowerCase().includes(q),
      );
    }

    this.viewList = list;
    if (this.currentPage > this._totalPages()) {
      this.currentPage = this._totalPages();
      writePageToUrl(this.currentPage, { replace: true });
    }
  }

  _clearDayFilter() {
    this.dayFilter = null;
    this.selectedCellIndex = null;
    this._resetPage();
    this._applyFilters();
    this._renderChart();
  }

  _activitySubtitle() {
    const currentYear = getShanghaiYear(Date.now());
    return this.activeYear === currentYear
      ? "近 52 周写作记录"
      : `${this.activeYear} 年全文`;
  }

  _renderChart() {
    if (!this._chartHost) return;
    render(this._chartTemplate(), this._chartHost);
    this._observeChart();
    this._applyCellSize();
  }

  _getTooltipEl() {
    return this._chartHost?.querySelector("[data-tooltip]");
  }

  _updateTooltip(hit, event) {
    this._cancelHideTooltip();

    const tooltip = this._getTooltipEl();
    const container = this._chartHost?.querySelector(".grid-container");
    if (!tooltip || !container) return;

    const text = this._cellTooltipText(hit.year, hit.index);
    if (!text) return;

    tooltip.textContent = text;

    const contRect = container.getBoundingClientRect();
    tooltip.style.left = `${event.clientX - contRect.left}px`;
    tooltip.style.top = `${event.clientY - contRect.top}px`;
    tooltip.classList.add("is-visible");
  }

  _cancelHideTooltip() {
    if (this._tooltipHideTimer != null) {
      clearTimeout(this._tooltipHideTimer);
      this._tooltipHideTimer = null;
    }
  }

  _scheduleHideTooltip() {
    this._cancelHideTooltip();
    this._tooltipHideTimer = setTimeout(() => {
      this._tooltipHideTimer = null;
      this._getTooltipEl()?.classList.remove("is-visible");
    }, TOOLTIP_HIDE_DELAY_MS);
  }

  _hideTooltip() {
    this._cancelHideTooltip();
    this._getTooltipEl()?.classList.remove("is-visible");
  }

  _cellFromEvent(event) {
    const el = event.target.closest(".grid-item[data-index]");
    if (!el) return null;

    return {
      year: Number(el.dataset.year),
      index: Number(el.dataset.index),
    };
  }

  _onCellEnter(event) {
    const hit = this._cellFromEvent(event);
    if (!hit) return;
    this._updateTooltip(hit, event);
  }

  _onCellMove(event) {
    const hit = this._cellFromEvent(event);
    if (!hit) return;
    this._updateTooltip(hit, event);
  }

  _observeChart() {
    const main = this._chartHost?.querySelector(".grid-body-main");
    this._resizeObserver?.disconnect();
    if (main && "ResizeObserver" in window) {
      this._resizeObserver = new ResizeObserver(this._applyCellSize);
      this._resizeObserver.observe(main);
    }
  }

  _applyCellSize() {
    const wrapper = this._chartHost?.querySelector(".grid-body-content-wrapper");
    const main = this._chartHost?.querySelector(".grid-body-main");
    if (!main || !wrapper) return;

    const columns = this.gridColumns || 1;
    const available = main.clientWidth;
    if (available <= 0) return;

    const cell = Math.max(
      MIN_CELL_PX,
      (available - (columns - 1) * GAP_PX) / columns,
    );

    const rounded = Math.round(cell * 100) / 100;
    wrapper.style.setProperty("--cell-size", `${rounded}px`);
    wrapper.style.setProperty("--cell-gap", `${GAP_PX}px`);
    wrapper.style.setProperty("--grid-columns", String(columns));
  }

  _onCellLeave(event) {
    const next = event.relatedTarget;
    if (next instanceof Element && next.closest(".grid-item[data-index]")) {
      return;
    }
    this._scheduleHideTooltip();
  }

  _chartTemplate() {
    return html`
      <div class="activity-heading">
        <h2>活力表</h2>
        <p class="activity-subtitle">${this._activitySubtitle()}</p>
      </div>
      <div class="grid-container">
        <div class="grid-header-wrapper">
          <div class="grid-header">
            <div class="scroll-container" role="tablist" aria-label="年份">
              ${this.yearList.map(
                (year) => html`<button
                  type="button"
                  role="tab"
                  aria-selected=${this.activeYear === year}
                  @click=${() => this._updateActiveYear(year)}
                  class="year-btn ${this.activeYear === year ? "active" : ""}"
                >
                  ${year}
                </button>`,
              )}
            </div>
          </div>
        </div>
        <div class="activity-chart-scroll">
          <div class="grid-body">
            <div
              class="grid-body-content-wrapper"
              style="--grid-columns: ${this.gridColumns}; --cell-gap: ${GAP_PX}px"
            >
              <div class="grid-body-aside" aria-hidden="true">
                <span>日</span>
                <span>二</span>
                <span>四</span>
                <span>六</span>
              </div>
              <div class="grid-body-main">
                <div class="grid-body-header">
                  ${this.monthLabels.map(
                    ({ month, column }, index) => html`<span
                      class=${index === 0
                        ? "is-start"
                        : index === this.monthLabels.length - 1
                          ? "is-end"
                          : nothing}
                      style="left: calc(${column} * (var(--cell-size) + var(--cell-gap)))"
                      >${month}月</span
                    >`,
                  )}
                </div>
                <div class="grid-body-content">
                  ${(this.yearClassResult[this.activeYear] || []).map(
                    (cell, index) => {
                      const label = this._cellTooltipText(
                        this.activeYear,
                        index,
                      );
                      return cell
                        ? html`<button
                            type="button"
                            class="grid-item color-${Math.ceil(
                              cell.length / 3,
                            )} ${this.selectedCellIndex === index
                              ? "is-selected"
                              : ""}"
                            data-year="${this.activeYear}"
                            data-index="${index}"
                            @click=${() =>
                              this._updateViewList(this.activeYear, index)}
                            @pointerenter=${this._onCellEnter}
                            @pointermove=${this._onCellMove}
                            @pointerleave=${this._onCellLeave}
                            aria-label="${label ?? ""}"
                          ></button>`
                        : html`<span
                            class="grid-item is-empty"
                            data-year="${this.activeYear}"
                            data-index="${index}"
                            @pointerenter=${this._onCellEnter}
                            @pointermove=${this._onCellMove}
                            @pointerleave=${this._onCellLeave}
                            aria-label="${label ?? ""}"
                          ></span>`;
                    },
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="activity-tooltip" data-tooltip></div>
        <div class="activity-footer">
          <span class="activity-hint">点击色块按日期筛选</span>
          <div class="activity-legend" aria-hidden="true">
            <span>少</span>
            <span class="legend-cell level-0"></span>
            <span class="legend-cell level-1"></span>
            <span class="legend-cell level-2"></span>
            <span class="legend-cell level-3"></span>
            <span class="legend-cell level-4"></span>
            <span>多</span>
          </div>
        </div>
      </div>
    `;
  }

  static styles = unsafeCSS(
    StyleInline +
      MdListStyleInline +
      FormStyleInline +
      `
      .archive-loading {
        margin-top: 1.5rem;
        text-align: center;
        color: var(--ink-soft);
        padding: 2rem 1rem;
      }
      .list .dir {
        cursor: pointer;
        text-decoration: underline;
        text-decoration-color: transparent;
      }
      .list .dir:hover {
        text-decoration-color: currentColor;
      }
    `,
  );
}

window.customElements.define(`archive-list`, ArchiveList);
