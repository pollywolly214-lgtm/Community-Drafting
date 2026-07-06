const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));

const closeDropdowns = () => {
  dropdowns.forEach((dropdown) => {
    dropdown.classList.remove("is-open");
    const button = dropdown.querySelector(".nav-pill--button");
    if (button) button.setAttribute("aria-expanded", "false");
  });
};

dropdowns.forEach((dropdown) => {
  const button = dropdown.querySelector(".nav-pill--button");
  if (!button) return;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = dropdown.classList.contains("is-open");
    closeDropdowns();

    if (!isOpen) {
      dropdown.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    }
  });
});

document.addEventListener("click", (event) => {
  dropdowns.forEach((dropdown) => {
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove("is-open");
      const button = dropdown.querySelector(".nav-pill--button");
      if (button) button.setAttribute("aria-expanded", "false");
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDropdowns();
  }
});

const DEVELOPER_PASSWORD = "abc";
const PERSONALIZATION_STORAGE_KEY = "draftingSitePersonalizationV1";
const DEVELOPER_SESSION_KEY = "draftingSiteDeveloperModeActive";
const LEGACY_ADMIN_STORAGE_KEY = "community-drafting-admin";
const DEVELOPER_BODY_CLASS = "developer-mode-active";
const EDITABLE_SELECTOR = ".hero-content, .hero-card, main > .section, .grid > .card, .image-grid > .image-card, .developer-custom-window";
const EDITABLE_TEXT_SELECTOR = "h1, h2, h3, h4, p, figcaption, li, span[data-admin-key]";
const PANEL_DEFAULT_POSITION = { x: 16, y: 16 };
const GRID_SIZE = 12;
const MIN_CARD_WIDTH = 180;
const MIN_CARD_HEIGHT = 120;
const MIN_BUBBLE_WIDTH = 90;
const MIN_BUBBLE_HEIGHT = 44;
const EDITING_CANVAS_MIN_HEIGHT = 720;
const EDITING_CANVAS_EDGE_PADDING = 96;
const FONT_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const adminPanel = document.getElementById("admin-panel");
const adminSaveButton = document.getElementById("admin-save");
const adminExitButton = document.getElementById("admin-exit");
const adminUpdateTitle = document.getElementById("admin-update-title");
const adminUpdateBody = document.getElementById("admin-update-body");
const adminAddUpdate = document.getElementById("admin-add-update");
const adminImageInput = document.getElementById("admin-image-input");

let developerModeEnabled = false;
let activeImageTarget = null;
let activeImageFilename = "";
let activeWindowImageData = null;
let activeWindowImageFilename = "";
let draggedEditableItem = null;
let activeLayoutDrag = null;
let activeBubbleDrag = null;
let activeTextDrag = null;
let activePanelDrag = null;
let personalizationState = null;

const pageKey = window.location.pathname.split("/").pop() || "index.html";

const getEditableImages = () => Array.from(document.querySelectorAll("[data-admin-image]"));
const getEditableLists = () => Array.from(document.querySelectorAll("[data-admin-list]"));
const getEditableLayoutItems = () => Array.from(document.querySelectorAll(EDITABLE_SELECTOR));
const getPageStateBucket = (state, key) => state.pages?.[pageKey]?.[key] || {};

const sanitizeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizePanelPosition = (panel = {}) => ({
  x: Number.isFinite(panel.x) ? panel.x : PANEL_DEFAULT_POSITION.x,
  y: Number.isFinite(panel.y) ? panel.y : PANEL_DEFAULT_POSITION.y,
  collapsed: Boolean(panel.collapsed),
});

const normalizePersonalizationState = (state = {}) => {
  const normalized = {
    version: 3,
    updatedAt: state.updatedAt || new Date().toISOString(),
    images: state.images || {},
    layout: state.layout || {},
    text: state.text || {},
    lists: state.lists || {},
    windows: Array.isArray(state.windows) ? state.windows : [],
    pages: state.pages || {},
    ui: {
      ...(state.ui || {}),
      panel: normalizePanelPosition(state.ui?.panel),
    },
  };

  Object.keys(normalized.pages).forEach((key) => {
    normalized.pages[key] = {
      text: normalized.pages[key]?.text || {},
      layout: normalized.pages[key]?.layout || {},
      windows: Array.isArray(normalized.pages[key]?.windows) ? normalized.pages[key].windows : [],
      bubbles: normalized.pages[key]?.bubbles || {},
      textLayout: normalized.pages[key]?.textLayout || {},
    };
  });

  if (!normalized.pages[pageKey]) {
    normalized.pages[pageKey] = { text: {}, layout: {}, windows: [], bubbles: {}, textLayout: {} };
  }

  return normalized;
};

const loadPersonalizationState = () => {
  const raw = localStorage.getItem(PERSONALIZATION_STORAGE_KEY);
  if (raw) {
    try {
      return normalizePersonalizationState(JSON.parse(raw));
    } catch (error) {
      console.warn("Unable to parse saved personalization state.", error);
    }
  }

  const legacyRaw = localStorage.getItem(LEGACY_ADMIN_STORAGE_KEY);
  if (!legacyRaw) {
    return normalizePersonalizationState();
  }

  try {
    const legacyState = JSON.parse(legacyRaw);
    return normalizePersonalizationState({
      version: 2,
      updatedAt: new Date().toISOString(),
      images: Object.fromEntries(
        Object.entries(legacyState.images || {}).map(([key, src]) => [key, { src, filename: "legacy-upload" }]),
      ),
      layout: {},
      text: legacyState.text || {},
      lists: legacyState.lists || {},
      windows: [],
      pages: {},
    });
  } catch (error) {
    return normalizePersonalizationState();
  }
};

const saveStateObject = (state) => {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(state));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const snapToGrid = (value, gridSize = GRID_SIZE) => Math.round(value / gridSize) * gridSize;

const clampToViewport = (position, width, height) => ({
  x: clamp(Number.isFinite(position?.x) ? position.x : PANEL_DEFAULT_POSITION.x, 8, window.innerWidth - width - 8),
  y: clamp(Number.isFinite(position?.y) ? position.y : PANEL_DEFAULT_POSITION.y, 8, window.innerHeight - height - 8),
});

const clampPanelPosition = (position) => {
  if (!adminPanel) return normalizePanelPosition(position);
  const rect = adminPanel.getBoundingClientRect();
  return clampToViewport(position, Math.min(rect.width || 430, window.innerWidth - 16), Math.min(rect.height || 240, window.innerHeight - 16));
};

const expandContainerToFit = (container, rect) => {
  if (!container || !container.classList.contains("developer-free-layout-container")) return;
  const neededHeight = Math.ceil((Number(rect.y) || 0) + (Number(rect.height) || 0) + EDITING_CANVAS_EDGE_PADDING);
  if (neededHeight > container.clientHeight) {
    container.style.minHeight = `${neededHeight}px`;
  }
};

const clampToContainer = (rect, container, minWidth = MIN_CARD_WIDTH, minHeight = MIN_CARD_HEIGHT) => {
  expandContainerToFit(container, rect);
  const maxWidth = Math.max(minWidth, container.clientWidth);
  const maxHeight = Math.max(minHeight, container.clientHeight);
  const width = clamp(Number.isFinite(rect.width) ? rect.width : minWidth, minWidth, maxWidth);
  const height = clamp(Number.isFinite(rect.height) ? rect.height : minHeight, minHeight, maxHeight);
  return {
    x: clamp(Number.isFinite(rect.x) ? rect.x : 0, 0, Math.max(0, container.clientWidth - width)),
    y: clamp(Number.isFinite(rect.y) ? rect.y : 0, 0, Math.max(0, container.clientHeight - height)),
    width,
    height,
  };
};

const detectOverlap = (a, b) => !(
  a.x + a.width <= b.x ||
  b.x + b.width <= a.x ||
  a.y + a.height <= b.y ||
  b.y + b.height <= a.y
);

const rectFromElement = (element) => {
  const container = getLayoutContainer(element);
  if (container) {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return {
      x: Math.round(elementRect.left - containerRect.left),
      y: Math.round(elementRect.top - containerRect.top),
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
  }
  return {
    x: element.offsetLeft,
    y: element.offsetTop,
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
};

const getEditableContentMinimumSize = (element) => {
  const currentWidth = element.style.width;
  const currentHeight = element.style.height;
  element.style.width = "auto";
  element.style.height = "auto";
  const minimum = {
    width: Math.max(MIN_CARD_WIDTH, Math.ceil(element.scrollWidth + 4)),
    height: Math.max(MIN_CARD_HEIGHT, Math.ceil(element.scrollHeight + 4)),
  };
  element.style.width = currentWidth;
  element.style.height = currentHeight;
  return minimum;
};

const normalizeEditableRect = (element, rect, container) => {
  const minimum = getEditableContentMinimumSize(element);
  return clampToContainer({
    ...rect,
    width: Math.max(rect.width || 0, minimum.width),
    height: Math.max(rect.height || 0, minimum.height),
  }, container, minimum.width, minimum.height);
};

const findNearestNonOverlappingPosition = (candidate, others, container) => {
  const initial = clampToContainer(candidate, container, MIN_CARD_WIDTH, MIN_CARD_HEIGHT);
  if (!others.some((other) => detectOverlap(initial, other))) return initial;

  const step = GRID_SIZE;
  const maxRadius = Math.max(container.clientWidth, container.clientHeight) + step;
  let best = null;
  let bestDistance = Infinity;
  for (let radius = step; radius <= maxRadius; radius += step) {
    for (let dx = -radius; dx <= radius; dx += step) {
      for (let dy = -radius; dy <= radius; dy += step) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const option = clampToContainer({ ...initial, x: initial.x + dx, y: initial.y + dy }, container, MIN_CARD_WIDTH, MIN_CARD_HEIGHT);
        if (others.some((other) => detectOverlap(option, other))) continue;
        const distance = Math.hypot(option.x - initial.x, option.y - initial.y);
        if (distance < bestDistance) {
          best = option;
          bestDistance = distance;
        }
      }
    }
    if (best) return best;
  }
  return initial;
};

const getLayoutContainer = () => document.querySelector("main");

const isRelatedEditableItem = (item, element) => item === element || item.contains(element) || element.contains(item);

const getSiblingRects = (element) => getSiblingLayoutItems(element)
  .filter((item) => !isRelatedEditableItem(item, element) && item.classList.contains("developer-free-layout-item"))
  .map(rectFromElement);

const applyLayoutRect = (element, rect) => {
  element.style.left = `${Math.round(rect.x)}px`;
  element.style.top = `${Math.round(rect.y)}px`;
  element.style.width = `${Math.round(rect.width)}px`;
  element.style.height = `${Math.round(rect.height)}px`;
};

const ensureFreeLayoutContainer = (container) => {
  if (!container || container.dataset.freeLayoutReady === "true") return;
  const children = Array.from(container.querySelectorAll(".developer-editable"));
  if (children.length < 1) return;
  const containerRect = container.getBoundingClientRect();
  children.forEach((child) => {
    const childRect = child.getBoundingClientRect();
    child.dataset.flowX = String(Math.max(0, Math.round(childRect.left - containerRect.left)));
    child.dataset.flowY = String(Math.max(0, Math.round(childRect.top - containerRect.top)));
  });
  container.style.minHeight = `${Math.max(EDITING_CANVAS_MIN_HEIGHT, container.clientHeight, ...children.map((child) => Number(child.dataset.flowY || 0) + child.offsetHeight + EDITING_CANVAS_EDGE_PADDING))}px`;
  container.classList.add("developer-free-layout-container");
  container.dataset.freeLayoutReady = "true";
};

const createPanelControls = () => {
  if (!adminPanel || adminPanel.dataset.panelControlsReady === "true") return;
  adminPanel.dataset.panelControlsReady = "true";
  const header = adminPanel.querySelector(".admin-panel__header");
  const actions = adminPanel.querySelector(".admin-actions");
  if (!header || !actions) return;
  header.classList.add("admin-panel__drag-handle");
  header.title = "Drag to move Developer Mode panel";
  const reset = document.createElement("button");
  reset.className = "ghost admin-panel__utility";
  reset.type = "button";
  reset.textContent = "Reset Panel Position";
  reset.addEventListener("click", (event) => {
    event.stopPropagation();
    setPanelPosition(PANEL_DEFAULT_POSITION, true);
  });
  const collapse = document.createElement("button");
  collapse.className = "ghost admin-panel__utility";
  collapse.type = "button";
  collapse.textContent = "Minimize";
  collapse.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePanelCollapsed();
  });
  actions.prepend(reset, collapse);
  header.addEventListener("pointerdown", startPanelDrag);
};

const setPanelPosition = (position, persist = false) => {
  if (!adminPanel) return;
  const clamped = clampPanelPosition(position);
  adminPanel.style.left = `${Math.round(clamped.x)}px`;
  adminPanel.style.top = `${Math.round(clamped.y)}px`;
  adminPanel.style.right = "auto";
  adminPanel.style.bottom = "auto";
  if (persist) {
    const state = normalizePersonalizationState(personalizationState || loadPersonalizationState());
    state.ui.panel = { ...normalizePanelPosition(state.ui.panel), ...clamped };
    personalizationState = state;
    saveStateObject(state);
  }
};

const applyPanelState = () => {
  if (!adminPanel) return;
  createPanelControls();
  const state = normalizePersonalizationState(personalizationState || loadPersonalizationState());
  const clamped = clampPanelPosition(state.ui.panel);
  state.ui.panel = { ...state.ui.panel, ...clamped };
  personalizationState = state;
  saveStateObject(state);
  setPanelPosition(clamped, false);
  adminPanel.classList.toggle("admin-panel--collapsed", Boolean(state.ui.panel.collapsed));
  const collapseButton = adminPanel.querySelector(".admin-panel__utility:nth-child(2)");
  if (collapseButton) collapseButton.textContent = state.ui.panel.collapsed ? "Expand" : "Minimize";
};

const togglePanelCollapsed = () => {
  const state = normalizePersonalizationState(personalizationState || loadPersonalizationState());
  state.ui.panel = { ...normalizePanelPosition(state.ui.panel), collapsed: !state.ui.panel.collapsed };
  personalizationState = state;
  saveStateObject(state);
  applyPanelState();
};

const startPanelDrag = (event) => {
  if (!developerModeEnabled || !adminPanel || event.target.closest("button, input, textarea, select, label")) return;
  event.preventDefault();
  const rect = adminPanel.getBoundingClientRect();
  activePanelDrag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
  adminPanel.setPointerCapture?.(event.pointerId);
};

document.addEventListener("pointermove", (event) => {
  if (activePanelDrag) {
    setPanelPosition({ x: event.clientX - activePanelDrag.dx, y: event.clientY - activePanelDrag.dy }, false);
  }
});

document.addEventListener("pointerup", () => {
  if (activePanelDrag) {
    activePanelDrag = null;
    const rect = adminPanel.getBoundingClientRect();
    setPanelPosition({ x: rect.left, y: rect.top }, true);
  }
});

window.addEventListener("resize", () => {
  if (adminPanel) {
    const rect = adminPanel.getBoundingClientRect();
    setPanelPosition({ x: rect.left, y: rect.top }, true);
  }
});

const getEditableId = (element, index = 0) => {
  if (element.dataset.developerId) {
    return element.dataset.developerId;
  }

  const image = element.matches("[data-admin-image]") ? element : element.querySelector("[data-admin-image]");
  const text = element.matches("[data-admin-key]") ? element : element.querySelector("[data-admin-key]");
  const list = element.matches("[data-admin-list]") ? element : element.querySelector("[data-admin-list]");
  const heading = element.querySelector("h1, h2, h3, h4");
  const source = image?.dataset.adminImage || text?.dataset.adminKey || list?.dataset.adminList || heading?.textContent || `${element.tagName}-${index}`;
  const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  element.dataset.developerId = `${pageKey}:${slug || index}`;
  return element.dataset.developerId;
};

const getTextNodeId = (node, parentId, index) => {
  if (node.dataset.adminKey) {
    return `global:${node.dataset.adminKey}`;
  }
  if (!node.dataset.developerTextId) {
    const snippet = node.textContent.trim().slice(0, 28).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    node.dataset.developerTextId = `${parentId}:text-${snippet || index}`;
  }
  return node.dataset.developerTextId;
};

const getEditableTextNodes = () => {
  const textNodes = [];
  getEditableLayoutItems().forEach((item, itemIndex) => {
    const parentId = getEditableId(item, itemIndex);
    const candidates = item.matches(EDITABLE_TEXT_SELECTOR)
      ? [item, ...Array.from(item.querySelectorAll(EDITABLE_TEXT_SELECTOR))]
      : Array.from(item.querySelectorAll(EDITABLE_TEXT_SELECTOR));

    candidates.forEach((node, nodeIndex) => {
      if (node.closest(".developer-controls") || node.closest("button") || node.closest("label")) {
        return;
      }
      getTextNodeId(node, parentId, nodeIndex);
      textNodes.push(node);
    });
  });
  return textNodes;
};

const createCustomWindowArea = () => {
  let area = document.querySelector("[data-developer-window-area]");
  if (area) {
    return area;
  }

  const main = document.querySelector("main");
  if (!main) {
    return null;
  }

  area = document.createElement("section");
  area.className = "section developer-window-area";
  area.dataset.developerWindowArea = "true";
  area.innerHTML = `<h2>Custom windows</h2><div class="developer-window-grid" data-developer-window-grid></div>`;
  main.append(area);
  return area;
};

const getCustomWindowGrid = () => createCustomWindowArea()?.querySelector("[data-developer-window-grid]");

const renderCustomWindows = (state) => {
  const windows = state.pages?.[pageKey]?.windows || [];
  if (!windows.length && !developerModeEnabled) {
    return;
  }

  const area = createCustomWindowArea();
  const grid = getCustomWindowGrid();
  if (!area || !grid) {
    return;
  }

  area.hidden = !windows.length && !developerModeEnabled;
  grid.innerHTML = "";

  windows.forEach((windowItem) => {
    const card = document.createElement("article");
    card.className = "card gradient-border developer-custom-window";
    card.dataset.developerId = windowItem.id;
    card.dataset.customWindowId = windowItem.id;
    if (windowItem.fontFamily) {
      card.style.fontFamily = windowItem.fontFamily;
    }

    const imageMarkup = windowItem.image?.src
      ? `<img class="developer-custom-window__image" src="${windowItem.image.src}" alt="${sanitizeHtml(windowItem.image.filename || windowItem.title || "Custom window image")}" data-admin-image="${windowItem.id}:image" data-developer-filename="${sanitizeHtml(windowItem.image.filename || "custom-window-image")}" />`
      : "";

    card.innerHTML = `
      ${imageMarkup}
      <h3>${sanitizeHtml(windowItem.title || "New window")}</h3>
      <p>${sanitizeHtml(windowItem.body || "Add details for this window.")}</p>
    `;
    renderTextBubbles(card, state.pages?.[pageKey]?.bubbles?.[windowItem.id] || []);
    grid.append(card);
  });
};

const applyPersonalizationState = (state) => {
  if (!state) {
    return;
  }

  renderCustomWindows(state);

  const pageText = getPageStateBucket(state, "text");
  getEditableTextNodes().forEach((node) => {
    const key = node.dataset.adminKey;
    const textId = node.dataset.developerTextId;
    if (key && state.text[key]) {
      node.innerHTML = state.text[key];
    }
    if (textId && pageText[textId]) {
      node.innerHTML = pageText[textId];
    }
    const textLayout = state.pages?.[pageKey]?.textLayout?.[textId];
    if (textLayout && Number.isFinite(textLayout.x) && Number.isFinite(textLayout.y)) {
      node.style.transform = `translate(${textLayout.x}px, ${textLayout.y}px)`;
      node.dataset.textX = String(textLayout.x);
      node.dataset.textY = String(textLayout.y);
    }
  });

  if (state.images) {
    getEditableImages().forEach((img) => {
      const key = img.dataset.adminImage;
      const imageState = state.images[key];
      const src = typeof imageState === "string" ? imageState : imageState?.src;
      if (key && src) {
        img.src = src;
        if (imageState?.filename) {
          img.dataset.developerFilename = imageState.filename;
        }
      }
    });
  }

  if (state.lists) {
    getEditableLists().forEach((list) => {
      const key = list.dataset.adminList;
      if (key && state.lists[key]) {
        list.innerHTML = state.lists[key];
      }
    });
  }

  const pageLayout = getPageStateBucket(state, "layout");
  const mergedLayout = { ...state.layout, ...pageLayout };
  getEditableLayoutItems().forEach((element, index) => {
    const id = getEditableId(element, index);
    const layout = mergedLayout[id];
    if (!layout) {
      return;
    }
    if (Number.isFinite(layout.order)) {
      element.style.order = String(layout.order);
    }
    if (Number.isFinite(layout.width) && layout.width > 0) {
      element.style.width = `${layout.width}px`;
    }
    if (Number.isFinite(layout.height) && layout.height > 0) {
      element.style.height = `${layout.height}px`;
    }
    if (layout.free === true && Number.isFinite(layout.x) && Number.isFinite(layout.y)) {
      const container = getLayoutContainer(element);
      ensureFreeLayoutContainer(container);
      element.classList.add("developer-free-layout-item");
      element.style.left = `${layout.x}px`;
      element.style.top = `${layout.y}px`;
    }
    if (layout.fontFamily !== undefined) {
      element.style.fontFamily = layout.fontFamily;
    }
    renderTextBubbles(element, state.pages?.[pageKey]?.bubbles?.[id] || []);
  });
};

const collectPersonalizationState = () => {
  const state = normalizePersonalizationState(personalizationState || loadPersonalizationState());
  const page = state.pages[pageKey] || { text: {}, layout: {}, windows: [], bubbles: {}, textLayout: {} };
  const globalText = { ...state.text };
  const pageText = { ...page.text };
  const images = { ...state.images };
  const lists = { ...state.lists };
  const pageLayout = { ...page.layout };

  getEditableTextNodes().forEach((node) => {
    const key = node.dataset.adminKey;
    const textId = node.dataset.developerTextId;
    const value = node.innerHTML.trim();
    if (key) {
      globalText[key] = value;
    } else if (textId) {
      pageText[textId] = value;
    }
  });

  getEditableImages().forEach((img) => {
    const key = img.dataset.adminImage;
    if (key) {
      images[key] = {
        src: img.src,
        filename: img.dataset.developerFilename || "existing-image",
      };
    }
  });

  getEditableLists().forEach((list) => {
    const key = list.dataset.adminList;
    if (key) {
      lists[key] = list.innerHTML.trim();
    }
  });

  getEditableLayoutItems().forEach((element, index) => {
    const id = getEditableId(element, index);
    const rect = element.getBoundingClientRect();
    const isFree = element.classList.contains("developer-free-layout-item");
    pageLayout[id] = {
      ...(isFree ? { x: Math.round(element.offsetLeft || 0), y: Math.round(element.offsetTop || 0), free: true } : { free: false }),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      order: Number.parseInt(element.style.order || "", 10) || index + 1,
      fontFamily: element.style.fontFamily || "",
    };
  });

  state.version = 3;
  state.text = globalText;
  state.images = images;
  state.lists = lists;
  state.pages[pageKey] = {
    ...page,
    text: pageText,
    layout: pageLayout,
    windows: page.windows || [],
    bubbles: collectTextBubbleState(),
    textLayout: collectTextLayoutState(),
  };
  state.updatedAt = new Date().toISOString();
  personalizationState = state;
  return state;
};

const savePersonalizationState = () => {
  const state = collectPersonalizationState();
  saveStateObject(state);
  return state;
};

const syncPersonalizationToGitHub = async () => {
  // This repository is a static HTML/CSS/JS site. A browser-side GitHub token would be exposed,
  // so GitHub sync is intentionally unavailable unless a future server-side endpoint is added.
  return { ok: false, reason: "GitHub sync requires a server-side endpoint with a token stored in environment variables." };
};

const createDeveloperModeIndicator = () => {
  let indicator = document.querySelector(".developer-mode-indicator");
  if (indicator) {
    return indicator;
  }

  indicator = document.createElement("div");
  indicator.className = "developer-mode-indicator";
  indicator.setAttribute("role", "status");
  indicator.innerHTML = `<strong>Developer Mode Active</strong><span>Drag cards freely, resize, add text bubbles, change fonts, and upload images.</span>`;
  document.body.append(indicator);
  return indicator;
};

const createSettingsMenu = () => {
  const navBar = document.querySelector(".nav-bar");
  if (!navBar || document.querySelector(".settings-dropdown")) {
    return;
  }

  const settingsDropdown = document.createElement("div");
  settingsDropdown.className = "nav-dropdown settings-dropdown";
  settingsDropdown.innerHTML = `
    <button class="nav-pill nav-pill--button settings-button" type="button" aria-expanded="false" aria-haspopup="true" aria-label="Open settings menu">⚙ Settings</button>
    <div class="nav-dropdown-menu gradient-border settings-menu">
      <button class="settings-menu__item" id="developer-mode-toggle" type="button">Developer Mode</button>
      <p class="settings-menu__note">Personalization saves locally in this browser.</p>
    </div>
  `;

  const cta = navBar.querySelector(".nav-cta");
  navBar.insertBefore(settingsDropdown, cta || null);

  const button = settingsDropdown.querySelector(".settings-button");
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = settingsDropdown.classList.contains("is-open");
    closeDropdowns();
    if (!isOpen) {
      settingsDropdown.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    }
  });

  settingsDropdown.querySelector("#developer-mode-toggle").addEventListener("click", (event) => {
    event.stopPropagation();
    settingsDropdown.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    if (developerModeEnabled) {
      saveAndExitDeveloperMode();
    } else {
      requestDeveloperMode();
    }
  });

  dropdowns.push(settingsDropdown);
};

const createControlButton = (label, title, onClick) => {
  const button = document.createElement("button");
  button.className = "developer-control-button";
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
};

const createFontSelect = (element) => {
  const select = document.createElement("select");
  select.className = "developer-font-select";
  select.title = "Change this window font";
  FONT_OPTIONS.forEach((font) => {
    const option = document.createElement("option");
    option.value = font.value;
    option.textContent = font.label;
    select.append(option);
  });
  select.value = element.style.fontFamily || "";
  select.addEventListener("click", (event) => event.stopPropagation());
  select.addEventListener("change", () => {
    element.style.fontFamily = select.value;
    savePersonalizationState();
  });
  return select;
};

const createBubbleFontSelect = (bubble) => {
  const select = createFontSelect(bubble);
  select.title = "Change this text bubble font";
  return select;
};

const renderTextBubbles = (parent, bubbles = []) => {
  parent.querySelectorAll(":scope > .developer-text-bubble").forEach((bubble) => bubble.remove());
  bubbles.forEach((bubbleState) => {
    const bubble = document.createElement("div");
    bubble.className = "developer-text-bubble";
    bubble.dataset.bubbleId = bubbleState.id || `bubble-${Date.now()}`;
    bubble.setAttribute("contenteditable", String(developerModeEnabled));
    bubble.innerHTML = bubbleState.text || "Text bubble";
    bubble.style.left = `${Number.isFinite(bubbleState.x) ? bubbleState.x : 12}px`;
    bubble.style.top = `${Number.isFinite(bubbleState.y) ? bubbleState.y : 12}px`;
    bubble.style.width = `${Math.max(MIN_BUBBLE_WIDTH, bubbleState.width || 160)}px`;
    bubble.style.height = `${Math.max(MIN_BUBBLE_HEIGHT, bubbleState.height || 70)}px`;
    if (bubbleState.fontFamily !== undefined) bubble.style.fontFamily = bubbleState.fontFamily;
    bubble.addEventListener("blur", handleEditableTextBlur);
    bubble.addEventListener("keydown", handleEditableTextKeydown);
    setupTextBubbleDrag(bubble);
    parent.append(bubble);
  });
};

const collectTextBubbleState = () => {
  const bubbles = {};
  getEditableLayoutItems().forEach((parent, index) => {
    const parentId = getEditableId(parent, index);
    const parentBubbles = Array.from(parent.querySelectorAll(":scope > .developer-text-bubble")).map((bubble) => {
      const clone = bubble.cloneNode(true);
      clone.querySelectorAll(".developer-bubble-controls").forEach((control) => control.remove());
      return {
        id: bubble.dataset.bubbleId,
        x: Math.round(bubble.offsetLeft || 0),
        y: Math.round(bubble.offsetTop || 0),
        width: Math.round(bubble.offsetWidth || MIN_BUBBLE_WIDTH),
        height: Math.round(bubble.offsetHeight || MIN_BUBBLE_HEIGHT),
        text: clone.innerHTML.trim() || "Text bubble",
        fontFamily: bubble.style.fontFamily || "",
      };
    });
    if (parentBubbles.length) bubbles[parentId] = parentBubbles;
  });
  return bubbles;
};

const addTextBubble = (parent) => {
  const state = collectPersonalizationState();
  const parentId = getEditableId(parent);
  const page = state.pages[pageKey];
  const existing = page.bubbles[parentId] || [];
  existing.push({
    id: `${parentId}:bubble-${Date.now()}`,
    x: 16,
    y: 56,
    width: 170,
    height: 72,
    text: "New text bubble",
    fontFamily: "",
  });
  page.bubbles[parentId] = existing;
  personalizationState = state;
  saveStateObject(state);
  renderTextBubbles(parent, existing);
  setDeveloperMode(true);
};

const deleteTextBubble = (bubble) => {
  const parent = bubble.closest(".developer-editable");
  bubble.remove();
  const state = collectPersonalizationState();
  if (parent) renderTextBubbles(parent, state.pages?.[pageKey]?.bubbles?.[getEditableId(parent)] || []);
  personalizationState = state;
  saveStateObject(state);
  setDeveloperMode(true);
};

const setupTextBubbleDrag = (bubble) => {
  if (bubble.dataset.bubbleReady === "true") return;
  bubble.dataset.bubbleReady = "true";
  bubble.addEventListener("pointerdown", (event) => {
    if (!developerModeEnabled || event.target.closest(".developer-bubble-controls, button, select")) return;
    if (event.offsetX > bubble.clientWidth - 18 && event.offsetY > bubble.clientHeight - 18) return;
    event.preventDefault();
    const parent = bubble.parentElement;
    activeBubbleDrag = {
      bubble,
      parent,
      dx: event.clientX - bubble.offsetLeft,
      dy: event.clientY - bubble.offsetTop,
    };
    bubble.setPointerCapture?.(event.pointerId);
  });
};

document.addEventListener("pointermove", (event) => {
  if (!activeBubbleDrag) return;
  const { bubble, parent, dx, dy } = activeBubbleDrag;
  const rect = clampToContainer({
    x: event.clientX - dx,
    y: event.clientY - dy,
    width: bubble.offsetWidth,
    height: bubble.offsetHeight,
  }, parent, MIN_BUBBLE_WIDTH, MIN_BUBBLE_HEIGHT);
  bubble.style.left = `${rect.x}px`;
  bubble.style.top = `${rect.y}px`;
});

document.addEventListener("pointerup", () => {
  if (activeBubbleDrag) {
    activeBubbleDrag = null;
    savePersonalizationState();
  }
});

const addTextBubbleControls = () => {
  document.querySelectorAll(".developer-text-bubble").forEach((bubble) => {
    bubble.setAttribute("contenteditable", String(developerModeEnabled));
    if (!developerModeEnabled) return;
    if (bubble.querySelector(":scope > .developer-bubble-controls")) return;
    const controls = document.createElement("div");
    controls.className = "developer-bubble-controls";
    controls.setAttribute("contenteditable", "false");
    controls.append(
      createControlButton("Delete", "Delete this text bubble", () => deleteTextBubble(bubble)),
      createBubbleFontSelect(bubble),
    );
    bubble.prepend(controls);
  });
};

const removeTextBubbleControls = () => {
  document.querySelectorAll(".developer-bubble-controls").forEach((control) => control.remove());
  document.querySelectorAll(".developer-text-bubble").forEach((bubble) => bubble.setAttribute("contenteditable", "false"));
};

const getSiblingLayoutItems = (element) => {
  const container = getLayoutContainer(element);
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll(".developer-editable"));
};

const normalizeSiblingOrders = (siblings) => {
  siblings
    .sort((a, b) => Number.parseInt(a.style.order || "0", 10) - Number.parseInt(b.style.order || "0", 10))
    .forEach((item, index) => {
      item.style.order = String(index + 1);
    });
};

const moveEditableItem = (element, direction) => {
  const siblings = getSiblingLayoutItems(element);
  if (siblings.length < 2) {
    return;
  }
  normalizeSiblingOrders(siblings);
  const sorted = siblings.sort((a, b) => Number.parseInt(a.style.order, 10) - Number.parseInt(b.style.order, 10));
  const currentIndex = sorted.indexOf(element);
  const target = sorted[currentIndex + direction];
  if (!target) {
    return;
  }
  const currentOrder = element.style.order;
  element.style.order = target.style.order;
  target.style.order = currentOrder;
};

const settleEditableItem = (element, candidate) => {
  const container = getLayoutContainer(element);
  if (!container) return;
  ensureFreeLayoutContainer(container);
  applyLayoutRect(element, clampToContainer(candidate, container, MIN_CARD_WIDTH, MIN_CARD_HEIGHT));
};

const beginLayoutDrag = (element, event) => {
  if (!developerModeEnabled || !element) return;
  const container = getLayoutContainer(element);
  if (!container) return;
  ensureFreeLayoutContainer(container);
  const startRect = rectFromElement(element);
  element.classList.add("developer-free-layout-item");
  applyLayoutRect(element, startRect);
  event.preventDefault();
  event.stopPropagation();
  activeLayoutDrag = {
    element,
    container,
    dx: event.clientX - startRect.x,
    dy: event.clientY - startRect.y,
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
  element.classList.add("developer-editable--dragging");
  element.setPointerCapture?.(event.pointerId);
};

const setupDragHandlers = (element) => {
  if (element.dataset.dragReady === "true") {
    return;
  }
  element.dataset.dragReady = "true";

  element.addEventListener("pointerdown", (event) => {
    if (!developerModeEnabled || event.target.closest(".developer-controls, .developer-text-bubble, [contenteditable='true'], button, input, textarea, select, label")) {
      return;
    }
    if (event.offsetX > element.clientWidth - 22 && event.offsetY > element.clientHeight - 22) {
      return;
    }
    beginLayoutDrag(element, event);
  });

};

document.addEventListener("pointermove", (event) => {
  if (!activeLayoutDrag) return;
  const { element, container, dx, dy, width, height } = activeLayoutDrag;
  const rect = clampToContainer({
    x: event.clientX - dx,
    y: event.clientY - dy,
    width,
    height,
  }, container, MIN_CARD_WIDTH, MIN_CARD_HEIGHT);
  applyLayoutRect(element, rect);
});

document.addEventListener("pointerup", () => {
  if (!activeLayoutDrag) return;
  const { element } = activeLayoutDrag;
  element.classList.remove("developer-editable--dragging");
  settleEditableItem(element, rectFromElement(element));
  activeLayoutDrag = null;
  savePersonalizationState();
});

const initializeEditableLayoutItems = () => {
  getEditableLayoutItems().forEach((element, index) => {
    getEditableId(element, index);
    element.classList.add("developer-editable");
    element.draggable = false;
    setupDragHandlers(element);
  });
};

const removeCustomWindow = (windowId) => {
  const state = collectPersonalizationState();
  const page = state.pages[pageKey];
  page.windows = (page.windows || []).filter((windowItem) => windowItem.id !== windowId);
  delete page.layout[windowId];
  delete page.bubbles?.[windowId];
  Object.keys(page.text || {}).forEach((key) => {
    if (key.startsWith(`${windowId}:`)) {
      delete page.text[key];
    }
  });
  Object.keys(state.images || {}).forEach((key) => {
    if (key.startsWith(`${windowId}:`)) {
      delete state.images[key];
    }
  });
  personalizationState = state;
  saveStateObject(state);
  renderCustomWindows(state);
  applyPersonalizationState(state);
  if (developerModeEnabled) {
    setDeveloperMode(true);
  }
};

const addDeveloperControls = () => {
  initializeEditableLayoutItems();
  getEditableLayoutItems().forEach((element) => {
    if (element.querySelector(":scope > .developer-controls")) {
      return;
    }

    const controls = document.createElement("div");
    controls.className = "developer-controls";
    controls.setAttribute("contenteditable", "false");
    const dragHandle = createControlButton("↕ Move", "Drag this handle to move the whole card/window", () => {});
    dragHandle.classList.add("developer-card-drag-handle");
    dragHandle.addEventListener("pointerdown", (event) => beginLayoutDrag(element, event));
    controls.append(
      dragHandle,
      createControlButton("↑", "Move earlier", () => moveEditableItem(element, -1)),
      createControlButton("↓", "Move later", () => moveEditableItem(element, 1)),
      createControlButton("Fit content", "Grow this card so its contents fit cleanly", () => {
        const container = getLayoutContainer(element);
        if (container) {
          settleEditableItem(element, rectFromElement(element));
          savePersonalizationState();
        }
      }),
      createFontSelect(element),
    );

    const image = element.matches("[data-admin-image]") ? element : element.querySelector("[data-admin-image]");
    if (image) {
      controls.append(
        createControlButton("Upload image", "Replace this image", () => {
          activeImageTarget = image;
          adminImageInput?.click();
        }),
      );
    }

    const customWindowId = element.dataset.customWindowId;
    if (customWindowId) {
      controls.append(
        createControlButton("Delete", "Delete this custom window", () => {
          if (window.confirm("Delete this custom window?")) {
            removeCustomWindow(customWindowId);
          }
        }),
      );
    }

    element.prepend(controls);
  });
};

const removeDeveloperControls = () => {
  document.querySelectorAll(".developer-controls").forEach((control) => control.remove());
};

const handleEditableTextBlur = () => {
  if (developerModeEnabled) {
    savePersonalizationState();
  }
};

const handleEditableTextKeydown = (event) => {
  if (!developerModeEnabled) {
    return;
  }
  if (event.key === "Enter" && !event.shiftKey && !["P", "LI"].includes(event.currentTarget.tagName)) {
    event.preventDefault();
    event.currentTarget.blur();
  }
};

const collectTextLayoutState = () => {
  const textLayout = {};
  getEditableTextNodes().forEach((node) => {
    const textId = node.dataset.developerTextId;
    const x = Number.parseFloat(node.dataset.textX || "0");
    const y = Number.parseFloat(node.dataset.textY || "0");
    if (textId && (x || y)) {
      textLayout[textId] = { x: Math.round(x), y: Math.round(y) };
    }
  });
  return textLayout;
};

const moveTextNode = (node, x, y) => {
  node.dataset.textX = String(Math.round(x));
  node.dataset.textY = String(Math.round(y));
  node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
};

const setupMovableTextNode = (node) => {
  if (node.dataset.moveHandlersReady === "true") return;
  node.dataset.moveHandlersReady = "true";
  node.addEventListener("pointerdown", (event) => {
    if (!developerModeEnabled || event.button !== 0 || event.detail > 1 || event.target.closest(".developer-controls, .developer-bubble-controls")) return;
    const startX = Number.parseFloat(node.dataset.textX || "0");
    const startY = Number.parseFloat(node.dataset.textY || "0");
    activeTextDrag = {
      node,
      startX,
      startY,
      pointerX: event.clientX,
      pointerY: event.clientY,
      moved: false,
    };
  });
};

document.addEventListener("pointermove", (event) => {
  if (!activeTextDrag) return;
  const dx = event.clientX - activeTextDrag.pointerX;
  const dy = event.clientY - activeTextDrag.pointerY;
  if (!activeTextDrag.moved && Math.hypot(dx, dy) < 5) return;
  activeTextDrag.moved = true;
  event.preventDefault();
  moveTextNode(activeTextDrag.node, activeTextDrag.startX + dx, activeTextDrag.startY + dy);
});

document.addEventListener("pointerup", () => {
  if (!activeTextDrag) return;
  const shouldSave = activeTextDrag.moved;
  activeTextDrag = null;
  if (shouldSave) savePersonalizationState();
});

const setEditableTextMode = (enabled) => {
  getEditableTextNodes().forEach((node) => {
    node.setAttribute("contenteditable", String(enabled));
    node.classList.toggle("developer-text-editable", enabled);
    if (node.dataset.textHandlersReady !== "true") {
      node.dataset.textHandlersReady = "true";
      node.addEventListener("blur", handleEditableTextBlur);
      node.addEventListener("keydown", handleEditableTextKeydown);
      node.addEventListener("dragstart", (event) => event.preventDefault());
    }
  });
};

const buildAddWindowForm = () => `
  <div class="admin-card admin-card--wide developer-add-window-card">
    <h4>Add New Window</h4>
    <p class="developer-help-text">Create a new editable card in the Custom windows area on this page.</p>
    <label>
      Title
      <input id="developer-window-title" type="text" placeholder="Window title" />
    </label>
    <label>
      Body text/details
      <textarea id="developer-window-body" rows="3" placeholder="Details to show inside the new window"></textarea>
    </label>
    <label>
      Font
      <select id="developer-window-font">
        ${FONT_OPTIONS.map((font) => `<option value="${sanitizeHtml(font.value)}">${font.label}</option>`).join("")}
      </select>
    </label>
    <label>
      Optional image
      <input id="developer-window-image" type="file" accept="image/*" />
    </label>
    <button class="primary" id="developer-add-window" type="button">Add New Window</button>
  </div>
`;

const addCustomWindow = () => {
  const titleInput = document.getElementById("developer-window-title");
  const bodyInput = document.getElementById("developer-window-body");
  const fontInput = document.getElementById("developer-window-font");
  const title = titleInput?.value.trim();
  const body = bodyInput?.value.trim();
  if (!title || !body) {
    window.alert("Add both a title and body text for the new window.");
    return;
  }

  const state = collectPersonalizationState();
  const page = state.pages[pageKey];
  const id = `${pageKey}:custom-window-${Date.now()}`;
  const order = Object.keys(page.layout || {}).length + 1;
  page.windows = [
    ...(page.windows || []),
    {
      id,
      title,
      body,
      image: activeWindowImageData
        ? {
            src: activeWindowImageData,
            filename: activeWindowImageFilename || "custom-window-image",
          }
        : null,
      fontFamily: fontInput?.value || "",
      createdAt: new Date().toISOString(),
    },
  ];
  page.layout[id] = { x: 0, y: 0, width: 320, height: 220, order, fontFamily: fontInput?.value || "" };
  personalizationState = state;
  saveStateObject(state);

  activeWindowImageData = null;
  activeWindowImageFilename = "";
  renderCustomWindows(state);
  applyPersonalizationState(state);
  if (developerModeEnabled) {
    setDeveloperMode(true);
  }
  titleInput.value = "";
  bodyInput.value = "";
  if (fontInput) fontInput.value = "";
  const fileInput = document.getElementById("developer-window-image");
  if (fileInput) fileInput.value = "";
};

const setupAddWindowFormHandlers = () => {
  document.getElementById("developer-add-window")?.addEventListener("click", addCustomWindow);
  document.getElementById("developer-window-image")?.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
      activeWindowImageData = null;
      activeWindowImageFilename = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      activeWindowImageData = reader.result;
      activeWindowImageFilename = file.name;
    };
    reader.readAsDataURL(file);
  });
};

const updateAdminPanelCopy = () => {
  if (!adminPanel) {
    return;
  }

  const label = adminPanel.querySelector(".admin-label");
  const heading = adminPanel.querySelector("h3");
  const body = adminPanel.querySelector(".admin-panel__body");
  const footer = adminPanel.querySelector(".admin-footer");

  if (label) label.textContent = "Developer Mode Active";
  if (heading) heading.textContent = "Personalize this page";
  if (adminSaveButton) adminSaveButton.textContent = "Exit Developer Mode & Save";
  if (adminExitButton) adminExitButton.hidden = true;
  if (body) {
    body.innerHTML = `
      <div class="admin-card">
        <h4>Editing tips</h4>
        <ul>
          <li>Click highlighted text to edit it; changes save on blur and on exit.</li>
          <li>Click an image or use Upload image to replace it.</li>
          <li>Click text to edit it directly.</li>
          <li>Use the Move handle to drag cards/windows; resize from the lower-right corner.</li>
          <li>Use font dropdowns on cards, then save before exiting.</li>
        </ul>
      </div>
      ${buildAddWindowForm()}
    `;
    setupAddWindowFormHandlers();
  }
  if (footer) {
    footer.innerHTML = `Developer Mode remains active for this browser session. Saved locally with <strong>${PERSONALIZATION_STORAGE_KEY}</strong>.`;
  }
};

const setDeveloperMode = (enabled) => {
  developerModeEnabled = enabled;
  document.body.classList.toggle(DEVELOPER_BODY_CLASS, enabled);
  adminPanel?.setAttribute("aria-hidden", String(!enabled));
  createDeveloperModeIndicator();
  renderCustomWindows(personalizationState || normalizePersonalizationState());
  initializeEditableLayoutItems();
  updateAdminPanelCopy();
  setEditableTextMode(enabled);

  getEditableLayoutItems().forEach((element) => {
    element.classList.toggle("developer-editable--active", enabled);
    element.draggable = false;
  });

  const customArea = document.querySelector("[data-developer-window-area]");
  if (customArea) {
    const hasWindows = Boolean(personalizationState?.pages?.[pageKey]?.windows?.length);
    customArea.hidden = !enabled && !hasWindows;
  }

  if (enabled) {
    applyPanelState();
    addDeveloperControls();
    addTextBubbleControls();
  } else {
    removeDeveloperControls();
    removeTextBubbleControls();
  }
};

const requestDeveloperMode = () => {
  const response = window.prompt("Enter Developer Mode password");
  if (response === DEVELOPER_PASSWORD) {
    sessionStorage.setItem(DEVELOPER_SESSION_KEY, "true");
    setDeveloperMode(true);
  } else if (response !== null) {
    window.alert("Incorrect password. Developer Mode was not enabled.");
  }
};

const saveAndExitDeveloperMode = async () => {
  savePersonalizationState();
  sessionStorage.removeItem(DEVELOPER_SESSION_KEY);
  setDeveloperMode(false);
  const githubResult = await syncPersonalizationToGitHub();
  if (!githubResult.ok) {
    console.info(githubResult.reason);
  }
};

adminExitButton?.addEventListener("click", () => {
  saveAndExitDeveloperMode();
});

adminSaveButton?.addEventListener("click", () => {
  saveAndExitDeveloperMode();
});

adminAddUpdate?.addEventListener("click", (event) => {
  event.preventDefault();
  addCustomWindow();
});

getEditableImages().forEach((img) => {
  img.addEventListener("click", () => {
    if (!developerModeEnabled) {
      return;
    }
    activeImageTarget = img;
    adminImageInput?.click();
  });
});

adminImageInput?.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file || !activeImageTarget) {
    return;
  }
  activeImageFilename = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    activeImageTarget.src = reader.result;
    activeImageTarget.dataset.developerFilename = activeImageFilename;
    activeImageTarget = null;
    activeImageFilename = "";
    adminImageInput.value = "";
    savePersonalizationState();
  };
  reader.readAsDataURL(file);
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "`") {
    event.preventDefault();
    if (developerModeEnabled) {
      saveAndExitDeveloperMode();
    } else {
      requestDeveloperMode();
    }
  }
});

createSettingsMenu();
personalizationState = loadPersonalizationState();
renderCustomWindows(personalizationState);
initializeEditableLayoutItems();
applyPersonalizationState(personalizationState);
if (sessionStorage.getItem(DEVELOPER_SESSION_KEY) === "true") {
  setDeveloperMode(true);
}
