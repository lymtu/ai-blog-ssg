import {
  formatDateInShanghai,
  parseDatetimeLocalShanghai,
  toDatetimeLocalShanghai,
} from "./datetime.js";

const TOKEN_KEY = "blog_admin_token";

const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const mediaView = document.getElementById("media-view");
const editorView = document.getElementById("editor-view");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginSubmit = document.getElementById("login-submit");
const postsList = document.getElementById("posts-list");
const postsLoading = document.getElementById("posts-loading");
const postsEmpty = document.getElementById("posts-empty");
const postsStats = document.getElementById("posts-stats");
const searchInput = document.getElementById("search-input");
const editorForm = document.getElementById("editor-form");
const editorError = document.getElementById("editor-error");
const editorTitle = document.getElementById("editor-title");
const editorLead = document.getElementById("editor-lead");
const editorSubmit = document.getElementById("editor-submit");
const editorCancel = document.getElementById("editor-cancel");
const previewPane = document.getElementById("preview-pane");
const editorCompose = document.querySelector(".editor-compose");
const pathSegmentsEl = document.getElementById("path-segments");
const logoutBtn = document.getElementById("logout-btn");
const newPostBtn = document.getElementById("new-post-btn");
const emptyNewBtn = document.getElementById("empty-new-btn");
const exportBtn = document.getElementById("export-btn");
const mediaBtn = document.getElementById("media-btn");
const mediaBackBtn = document.getElementById("media-back-btn");
const mediaUploadInput = document.getElementById("media-upload-input");
const mediaDropzone = document.getElementById("media-dropzone");
const mediaLoading = document.getElementById("media-loading");
const mediaEmpty = document.getElementById("media-empty");
const mediaGrid = document.getElementById("media-grid");
const insertImageBtn = document.getElementById("insert-image-btn");
const imagePickerModal = document.getElementById("image-picker-modal");
const pickerUploadInput = document.getElementById("picker-upload-input");
const pickerLoading = document.getElementById("picker-loading");
const pickerEmpty = document.getElementById("picker-empty");
const pickerGrid = document.getElementById("picker-grid");
const backBtn = document.getElementById("back-btn");
const barSubtitle = document.getElementById("bar-subtitle");
const deleteModal = document.getElementById("delete-modal");
const deleteModalText = document.getElementById("delete-modal-text");
const deleteConfirm = document.getElementById("delete-confirm");
const toastEl = document.getElementById("toast");

let editing = null;
let allPosts = [];
let allMedia = [];
let pathTree = {};
let pendingDelete = null;
let toastTimer = null;
let previewTimer = null;
let previewRequestId = 0;

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(value) {
  if (value) localStorage.setItem(TOKEN_KEY, value);
  else localStorage.removeItem(TOKEN_KEY);
}

function show(view) {
  [loginView, dashboardView, mediaView, editorView].forEach((el) =>
    el.classList.add("hidden"),
  );
  view.classList.remove("hidden");

  if (view === loginView) {
    barSubtitle.textContent = "请登录";
  } else if (view === dashboardView) {
    barSubtitle.textContent = "文章列表";
  } else if (view === mediaView) {
    barSubtitle.textContent = "图片管理";
  } else {
    barSubtitle.textContent = editing ? "编辑文章" : "新建文章";
  }
}

function showToast(message, type = "success") {
  toastEl.textContent = message;
  toastEl.className = `toast toast--${type}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2800);
}

function setBusy(button, busy, busyText) {
  if (!button) return;
  if (busy) {
    button.dataset.defaultText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.defaultText || button.textContent;
    button.disabled = false;
  }
}

function formatDateTime(value) {
  if (!value) return "—";
  return formatDateInShanghai(value, "yyyy-MM-dd HH:mm");
}

function toDatetimeLocal(iso) {
  return toDatetimeLocalShanghai(iso);
}

async function api(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {}),
  };
  if (token()) headers.authorization = `Bearer ${token()}`;

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    logoutBtn.classList.add("hidden");
    show(loginView);
    throw new Error("登录已过期");
  }
  return res;
}

async function apiForm(path, formData) {
  const headers = {};
  if (token()) headers.authorization = `Bearer ${token()}`;

  const res = await fetch(path, {
    method: "POST",
    headers,
    body: formData,
  });

  if (res.status === 401) {
    setToken(null);
    logoutBtn.classList.add("hidden");
    show(loginView);
    throw new Error("登录已过期");
  }
  return res;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制到剪贴板");
  } catch {
    showToast("复制失败", "error");
  }
}

function markdownImage(item) {
  const alt = item.name.replace(/\.[^.]+$/, "");
  return `![${alt}](${item.url})`;
}

function insertAtCursor(textarea, snippet) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const prefix = before && !before.endsWith("\n") ? "\n\n" : "";
  const suffix = after && !after.startsWith("\n") ? "\n\n" : "";
  textarea.value = `${before}${prefix}${snippet}${suffix}${after}`;
  const cursor = (before + prefix + snippet).length;
  textarea.focus();
  textarea.setSelectionRange(cursor, cursor);
  scheduleMarkdownPreview();
}

function renderMediaCard(item, { picker = false } = {}) {
  const card = document.createElement("article");
  card.className = "media-card";
  card.role = "listitem";
  card.dataset.name = item.name;
  card.dataset.url = item.url;

  card.innerHTML = `
    <div class="media-card__thumb">
      <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.name)}" loading="lazy" />
    </div>
    <div class="media-card__body">
      <p class="media-card__name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</p>
      <p class="media-card__meta">${formatFileSize(item.size)}</p>
      <div class="media-card__actions">
        ${
          picker
            ? `<button type="button" class="primary" data-action="insert">插入</button>`
            : `<button type="button" data-action="copy-md">复制 MD</button>
               <button type="button" data-action="copy-url">复制 URL</button>
               <button type="button" class="danger" data-action="delete">删除</button>`
        }
      </div>
    </div>
  `;

  return card;
}

function renderMediaGrid(container, items, { picker = false, emptyEl = null } = {}) {
  container.innerHTML = "";
  if (emptyEl) emptyEl.classList.toggle("hidden", items.length > 0);

  for (const item of items) {
    container.appendChild(renderMediaCard(item, { picker }));
  }
}

async function loadMedia({ picker = false } = {}) {
  const grid = picker ? pickerGrid : mediaGrid;
  const loading = picker ? pickerLoading : mediaLoading;
  const empty = picker ? pickerEmpty : mediaEmpty;

  loading.classList.remove("hidden");
  grid.innerHTML = "";
  if (empty) empty.classList.add("hidden");

  try {
    const res = await api("/api/admin/uploads");
    const items = await res.json();
    allMedia = Array.isArray(items) ? items : [];
    renderMediaGrid(grid, allMedia, { picker, emptyEl: empty });
  } catch {
    if (!picker) showToast("图片加载失败", "error");
  } finally {
    loading.classList.add("hidden");
  }
}

async function uploadMediaFiles(fileList, { reloadPicker = false } = {}) {
  const files = [...fileList].filter(Boolean);
  if (files.length === 0) return;

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const res = await apiForm("/api/admin/uploads", formData);
  const data = await res.json();
  if (!res.ok) {
    showToast(data.error || "上传失败", "error");
    return;
  }

  showToast(`已上传 ${data.uploads?.length ?? files.length} 张图片`);
  await loadMedia();
  if (reloadPicker) await loadMedia({ picker: true });
}

function openMediaView() {
  show(mediaView);
  loadMedia().catch(() => showToast("图片加载失败", "error"));
}

function openImagePicker() {
  imagePickerModal.classList.remove("hidden");
  loadMedia({ picker: true }).catch(() => showToast("图片加载失败", "error"));
}

function closeImagePicker() {
  imagePickerModal.classList.add("hidden");
}

function handleMediaGridClick(event, { picker = false } = {}) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest(".media-card");
  if (!card) return;

  const item = {
    name: card.dataset.name,
    url: card.dataset.url,
  };

  const action = button.dataset.action;
  if (action === "copy-md") {
    copyText(markdownImage(item));
    return;
  }
  if (action === "copy-url") {
    copyText(new URL(item.url, window.location.origin).href);
    return;
  }
  if (action === "insert") {
    insertAtCursor(editorForm.body, markdownImage(item));
    closeImagePicker();
    showToast("已插入 Markdown 图片语法");
    return;
  }
  if (action === "delete") {
    openDeleteModal("image", item.name);
  }
}

function bindDropzone(zone, onFiles) {
  if (!zone) return;

  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("is-dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("is-dragover");
  });

  zone.addEventListener("drop", (event) => {
    event.preventDefault();
    zone.classList.remove("is-dragover");
    onFiles(event.dataTransfer?.files);
  });
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    const aTime = new Date(a.updatedTime ?? a.birthTime).getTime();
    const bTime = new Date(b.updatedTime ?? b.birthTime).getTime();
    return bTime - aTime;
  });
}

function normalizeSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[/\\]+/g, "-");
}

function normalizeCategory(value) {
  return String(value || "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\\/g, "/");
}

function normalizeSlug(value) {
  return normalizeSegment(value);
}

function postToSegments(post) {
  if (!post) return ["", ""];
  const dirs = post.category ? post.category.split("/").filter(Boolean) : [];
  return [...dirs, post.slug || ""];
}

function segmentsToCategorySlug(segments) {
  const normalized = segments.map(normalizeSegment).filter(Boolean);
  if (normalized.length < 2) return null;

  const slug = normalized.pop();
  const category = normalized.join("/");
  if (!category || !slug) return null;

  return { category, slug };
}

function parseArticlePath(pathValue) {
  const normalized = String(pathValue || "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\\/g, "/");
  if (!normalized) return null;

  const segments = normalized.split("/").filter(Boolean);
  return segmentsToCategorySlug(segments);
}

function buildPathTree(posts) {
  const tree = {};
  for (const post of posts) {
    const segments = post.type
      ? post.type.split("/").filter(Boolean).concat(post.baseName)
      : [post.baseName];
    let node = tree;
    for (const segment of segments) {
      if (!node[segment]) node[segment] = {};
      node = node[segment];
    }
  }
  return tree;
}

function getSegmentSuggestions(prefixSegments) {
  let node = pathTree;
  for (const segment of prefixSegments) {
    const key = normalizeSegment(segment);
    if (!key || !node[key]) return [];
    node = node[key];
  }
  return Object.keys(node).sort();
}

function getPathSegmentsFromDOM() {
  if (!pathSegmentsEl) return [];
  return [...pathSegmentsEl.querySelectorAll(".path-segment__input")].map(
    (input) => input.value,
  );
}

function segmentPlaceholder(index) {
  return String.fromCharCode(97 + Math.min(index, 25));
}

function renderPathSegments(segments) {
  if (!pathSegmentsEl) return;

  pathSegmentsEl.innerHTML = "";
  const values = segments.length >= 2 ? segments : ["", ""];

  values.forEach((value, index) => {
    if (index > 0) {
      const sep = document.createElement("span");
      sep.className = "path-segment__sep";
      sep.textContent = "/";
      sep.setAttribute("aria-hidden", "true");
      pathSegmentsEl.appendChild(sep);
    }

    const wrap = document.createElement("div");
    wrap.className = "path-segment";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "path-segment__input";
    input.value = value;
    input.required = true;
    input.autocomplete = "off";
    input.dataset.index = String(index);
    input.placeholder = segmentPlaceholder(index);

    const isFilename = index === values.length - 1;
    if (isFilename) {
      input.classList.add("path-segment__input--filename");
    }

    const listId = `path-segment-list-${index}`;
    input.setAttribute("list", listId);

    const datalist = document.createElement("datalist");
    datalist.id = listId;
    const prefix = values.slice(0, index);
    for (const option of getSegmentSuggestions(prefix)) {
      const el = document.createElement("option");
      el.value = option;
      datalist.appendChild(el);
    }

    wrap.append(input, datalist);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "path-segment__add";
    addBtn.title = "在此后添加一级";
    addBtn.setAttribute("aria-label", "在此后添加一级");
    addBtn.textContent = "+";
    addBtn.dataset.index = String(index);
    wrap.appendChild(addBtn);

    if (values.length > 2) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "path-segment__remove";
      removeBtn.title = "移除此级";
      removeBtn.setAttribute("aria-label", "移除此级");
      removeBtn.textContent = "×";
      removeBtn.dataset.index = String(index);
      wrap.appendChild(removeBtn);
    }

    pathSegmentsEl.appendChild(wrap);
  });
}

function insertPathSegmentAfter(index) {
  const segments = getPathSegmentsFromDOM();
  if (segments.length < 2) {
    renderPathSegments(["", ""]);
    refreshPathSegmentLists();
    return;
  }

  segments.splice(index + 1, 0, "");
  renderPathSegments(segments);
  refreshPathSegmentLists();

  const inputs = pathSegmentsEl?.querySelectorAll(".path-segment__input");
  const nextInput = inputs?.[index + 1];
  if (nextInput instanceof HTMLInputElement) {
    nextInput.focus();
  }
}

function removePathSegment(index) {
  const segments = getPathSegmentsFromDOM();
  if (segments.length <= 2) return;
  segments.splice(index, 1);
  renderPathSegments(segments);
  refreshPathSegmentLists();
}

function refreshPathSegmentLists() {
  if (!pathSegmentsEl) return;

  const segments = getPathSegmentsFromDOM();
  pathSegmentsEl.querySelectorAll(".path-segment__input").forEach((input, index) => {
    const listId = input.getAttribute("list");
    const datalist = listId ? document.getElementById(listId) : null;
    if (!datalist) return;

    datalist.innerHTML = "";
    for (const value of getSegmentSuggestions(segments.slice(0, index))) {
      const option = document.createElement("option");
      option.value = value;
      datalist.appendChild(option);
    }
  });
}

function setPathFromPost(post) {
  renderPathSegments(postToSegments(post));
  refreshPathSegmentLists();
}

function bindPreviewCopyButtons() {
  if (!previewPane) return;
  for (const btn of previewPane.querySelectorAll(".code-block__copy")) {
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
}

function filterPosts(posts, query) {
  const q = query.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter((post) => {
    const haystack = [
      post.type,
      post.baseName,
      post.title,
      post.url,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function renderPosts(posts) {
  postsList.innerHTML = "";
  const filtered = filterPosts(posts, searchInput.value);
  postsStats.textContent = filtered.length
    ? `共 ${filtered.length} 篇文章${searchInput.value.trim() ? "（已筛选）" : ""}`
    : searchInput.value.trim()
      ? "没有匹配的文章"
      : "";

  if (!posts.length) {
    postsEmpty.classList.remove("hidden");
    postsList.classList.add("hidden");
    return;
  }

  postsEmpty.classList.add("hidden");
  postsList.classList.remove("hidden");

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "state state--empty";
    empty.innerHTML = "<p>没有匹配的文章，试试其他关键词</p>";
    postsList.appendChild(empty);
    return;
  }

  for (const post of filtered) {
    const item = document.createElement("article");
    item.className = "post-item";
    item.setAttribute("role", "listitem");

    const head = document.createElement("div");
    head.className = "post-item__head";

    const title = document.createElement("h3");
    title.className = "post-item__title";
    title.textContent = post.title || post.baseName;

    const actions = document.createElement("div");
    actions.className = "post-item__actions";

    const postPath = `${post.type}/${post.baseName}`;

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "编辑";
    editBtn.dataset.path = postPath;
    editBtn.dataset.action = "edit";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "删除";
    deleteBtn.dataset.path = postPath;
    deleteBtn.dataset.title = post.title || post.baseName;
    deleteBtn.dataset.action = "delete";

    actions.append(editBtn, deleteBtn);
    head.append(title, actions);

    const meta = document.createElement("p");
    meta.className = "post-item__meta";

    const pathSpan = document.createElement("span");
    pathSpan.className = "post-item__slug";
    pathSpan.textContent = `/${normalizeCategory(post.type).split("/").filter(Boolean).concat(normalizeSlug(post.baseName)).join("/")}`;

    meta.append(pathSpan);

    const times = document.createElement("div");
    times.className = "post-item__times";
    times.innerHTML = `<span>创建 ${formatDateTime(post.birthTime)}</span><span>更新 ${formatDateTime(post.updatedTime ?? post.birthTime)}</span>`;

    item.append(head, meta, times);
    postsList.appendChild(item);
  }
}

async function loadPosts() {
  postsLoading.classList.remove("hidden");
  postsEmpty.classList.add("hidden");
  postsList.classList.add("hidden");

  try {
    const res = await api("/api/admin/posts");
    const posts = await res.json();
    allPosts = sortPosts(posts);
    pathTree = buildPathTree(allPosts);
    renderPosts(allPosts);
  } finally {
    postsLoading.classList.add("hidden");
  }
}

function buildAdminPostApiPath(category, slug) {
  const cat = normalizeCategory(category);
  const s = normalizeSlug(slug);
  if (!cat || !s) return "";
  return `/api/admin/posts/${cat.split("/").filter(Boolean).concat(s).join("/")}`;
}

function setEditorTab(mode) {
  if (!editorCompose) return;
  editorCompose.dataset.mode = mode;
  editorCompose.querySelectorAll("[data-editor-tab]").forEach((button) => {
    const active = button.dataset.editorTab === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
}

async function refreshMarkdownPreview() {
  if (!previewPane) return;

  const body = editorForm.body.value;
  if (!body.trim()) {
    previewPane.innerHTML =
      '<p class="preview-pane__placeholder">输入 Markdown 后将在此显示预览</p>';
    return;
  }

  const requestId = ++previewRequestId;
  previewPane.innerHTML = '<p class="preview-pane__loading">渲染中…</p>';

  try {
    const res = await api("/api/admin/preview", {
      method: "POST",
      body: JSON.stringify({
        title: editorForm.title.value.trim(),
        body,
      }),
    });

    if (requestId !== previewRequestId) return;

    const data = await res.json();
    if (!res.ok) {
      previewPane.innerHTML = `<p class="preview-pane__error">${data.error || "预览失败"}</p>`;
      return;
    }

    previewPane.innerHTML = `<div class="article-content">${data.html || ""}</div>`;
    bindPreviewCopyButtons();
    window.initMermaidDiagrams?.(previewPane).catch(() => {});
  } catch (err) {
    if (requestId !== previewRequestId) return;
    previewPane.innerHTML = `<p class="preview-pane__error">${err.message || "预览失败"}</p>`;
  }
}

function scheduleMarkdownPreview() {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(() => {
    refreshMarkdownPreview();
  }, 400);
}

function openEditor(post = null) {
  editing = post;
  editorTitle.textContent = post ? "编辑文章" : "新建文章";
  editorLead.textContent = post
    ? "修改后保存将更新 Markdown 并重新生成 HTML"
    : "填写 front matter 字段与 Markdown 正文";
  editorError.textContent = "";
  setPathFromPost(post);
  editorForm.title.value = post?.title || "";
  editorForm.description.value = post?.description || "";
  editorForm.date.value = post?.date
    ? toDatetimeLocal(post.date)
    : toDatetimeLocalShanghai(Date.now());
  editorForm.updated.value = post?.updated
    ? formatDateTime(post.updated)
    : "保存时自动更新";
  editorForm.body.value = post?.body || "";
  setEditorTab("edit");
  scheduleMarkdownPreview();
  show(editorView);
}

function openDeleteModal(kind, nameOrTitle, slug, category) {
  if (kind === "image") {
    pendingDelete = { kind: "image", name: nameOrTitle };
    deleteModalText.textContent = `确定删除图片「${nameOrTitle}」吗？引用该 URL 的 Markdown 将无法显示此图。`;
  } else {
    pendingDelete = { kind: "post", category, slug };
    deleteModalText.textContent = `确定删除「${nameOrTitle}」吗？此操作将移除 Markdown 源文件与已生成的 HTML，且不可恢复。`;
  }
  deleteModal.classList.remove("hidden");
}

function closeDeleteModal() {
  pendingDelete = null;
  deleteModal.classList.add("hidden");
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  setBusy(loginSubmit, true, "登录中…");

  try {
    const body = {
      username: loginForm.username.value,
      password: loginForm.password.value,
    };

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      loginError.textContent = data.error || "登录失败";
      return;
    }

    setToken(data.token);
    logoutBtn.classList.remove("hidden");
    show(dashboardView);
    try {
      await loadPosts();
      showToast("登录成功");
    } catch (err) {
      setToken(null);
      logoutBtn.classList.add("hidden");
      show(loginView);
      loginError.textContent =
        err instanceof Error ? err.message : "登录后加载失败，请重试";
    }
  } catch (err) {
    loginError.textContent =
      err instanceof Error ? err.message : "网络错误，请确认服务已启动";
  } finally {
    setBusy(loginSubmit, false);
  }
});

logoutBtn.addEventListener("click", () => {
  setToken(null);
  logoutBtn.classList.add("hidden");
  searchInput.value = "";
  show(loginView);
});

newPostBtn.addEventListener("click", () => openEditor());
emptyNewBtn.addEventListener("click", () => openEditor());
mediaBtn.addEventListener("click", () => openMediaView());
mediaBackBtn.addEventListener("click", async () => {
  show(dashboardView);
  await loadPosts();
});

mediaUploadInput?.addEventListener("change", async (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  try {
    await uploadMediaFiles(input.files);
  } finally {
    input.value = "";
  }
});

bindDropzone(mediaDropzone, (files) => {
  uploadMediaFiles(files).catch(() => showToast("上传失败", "error"));
});

mediaGrid?.addEventListener("click", (event) => {
  handleMediaGridClick(event, { picker: false });
});

insertImageBtn?.addEventListener("click", () => openImagePicker());

pickerUploadInput?.addEventListener("change", async (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  try {
    await uploadMediaFiles(input.files, { reloadPicker: true });
  } finally {
    input.value = "";
  }
});

pickerGrid?.addEventListener("click", (event) => {
  handleMediaGridClick(event, { picker: true });
});

imagePickerModal?.querySelectorAll("[data-close-image-picker]").forEach((el) => {
  el.addEventListener("click", closeImagePicker);
});

backBtn.addEventListener("click", async () => {
  show(dashboardView);
  await loadPosts();
});

editorCancel.addEventListener("click", async () => {
  show(dashboardView);
  await loadPosts();
});

exportBtn.addEventListener("click", async () => {
  setBusy(exportBtn, true, "导出中…");
  try {
    const res = await api("/api/admin/export/markdown");
    if (!res.ok) {
      showToast("导出失败", "error");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "markdown-export.zip";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Markdown 目录已导出");
  } catch {
    showToast("导出失败", "error");
  } finally {
    setBusy(exportBtn, false);
  }
});

searchInput.addEventListener("input", () => {
  renderPosts(allPosts);
});

pathSegmentsEl?.addEventListener("input", (e) => {
  if (e.target instanceof HTMLInputElement && e.target.classList.contains("path-segment__input")) {
    refreshPathSegmentLists();
  }
});

pathSegmentsEl?.addEventListener("click", (e) => {
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) return;

  if (target.classList.contains("path-segment__add")) {
    const index = Number(target.dataset.index);
    if (Number.isNaN(index)) return;
    insertPathSegmentAfter(index);
    return;
  }

  if (!target.classList.contains("path-segment__remove")) return;
  const index = Number(target.dataset.index);
  if (Number.isNaN(index)) return;
  removePathSegment(index);
});

editorForm.body.addEventListener("input", scheduleMarkdownPreview);

editorCompose?.querySelectorAll("[data-editor-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    setEditorTab(button.dataset.editorTab || "edit");
  });
});

postsList.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const { path, action } = target.dataset;
  if (!path || !action) return;

  const resolved = parseArticlePath(path);
  if (!resolved) return;

  const { category, slug } = resolved;

  if (action === "edit") {
    target.disabled = true;
    try {
      const res = await api(buildAdminPostApiPath(category, slug));
      const post = await res.json();
      openEditor(post);
    } finally {
      target.disabled = false;
    }
  }

  if (action === "delete") {
    openDeleteModal("post", target.dataset.title || slug, slug, category);
  }
});

deleteConfirm.addEventListener("click", async () => {
  if (!pendingDelete) return;
  deleteConfirm.disabled = true;
  try {
    if (pendingDelete.kind === "image") {
      const res = await api(
        `/api/admin/uploads/${encodeURIComponent(pendingDelete.name)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        showToast("删除失败", "error");
        return;
      }
      closeDeleteModal();
      await loadMedia();
      if (!imagePickerModal.classList.contains("hidden")) {
        await loadMedia({ picker: true });
      }
      showToast("图片已删除");
      return;
    }

    const { category, slug } = pendingDelete;
    const res = await api(buildAdminPostApiPath(category, slug), {
      method: "DELETE",
    });
    if (!res.ok) {
      showToast("删除失败", "error");
      return;
    }
    closeDeleteModal();
    await loadPosts();
    showToast("文章已删除");
  } catch {
    showToast("删除失败", "error");
  } finally {
    deleteConfirm.disabled = false;
  }
});

deleteModal.querySelectorAll("[data-close-modal]").forEach((el) => {
  el.addEventListener("click", closeDeleteModal);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!imagePickerModal.classList.contains("hidden")) {
      closeImagePicker();
      return;
    }
    if (!deleteModal.classList.contains("hidden")) {
      closeDeleteModal();
    }
  }
});

editorForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  editorError.textContent = "";

  const segments = getPathSegmentsFromDOM();
  const invalidSegment = segments.find(
    (segment) => segment.trim() && /[/\\]/.test(segment),
  );
  if (invalidSegment) {
    editorError.textContent = "每一级路径请单独填写，不要包含 / 或 \\";
    return;
  }

  const resolved = segmentsToCategorySlug(segments);
  if (!resolved) {
    editorError.textContent = "请填写至少两级有效路径（目录 + 文件名）";
    return;
  }

  const { category, slug } = resolved;

  setBusy(editorSubmit, true, "保存中…");

  const payload = {
    category,
    slug,
    title: editorForm.title.value.trim(),
    description: editorForm.description.value.trim(),
    date: parseDatetimeLocalShanghai(editorForm.date.value),
    body: editorForm.body.value,
  };

  if (editing) {
    payload.updated = new Date().toISOString();
  }

  try {
    let res;
    if (editing) {
      res = await api(buildAdminPostApiPath(editing.category, editing.slug), {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      res = await api("/api/admin/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    if (!res.ok) {
      editorError.textContent = data.error || "保存失败";
      return;
    }

    show(dashboardView);
    await loadPosts();
    showToast(editing ? "文章已更新" : "文章已创建");
    editing = null;
  } finally {
    setBusy(editorSubmit, false);
  }
});

if (token()) {
  logoutBtn.classList.remove("hidden");
  show(dashboardView);
  loadPosts().catch(() => {
    setToken(null);
    logoutBtn.classList.add("hidden");
    show(loginView);
    loginError.textContent = "登录已过期，请重新登录";
  });
} else {
  show(loginView);
}
