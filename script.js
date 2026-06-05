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

const normalizePersonalizationState = (state = {}) => {
  const normalized = {
    version: 2,
    updatedAt: state.updatedAt || new Date().toISOString(),
    images: state.images || {},
    layout: state.layout || {},
    text: state.text || {},
    lists: state.lists || {},
    windows: Array.isArray(state.windows) ? state.windows : [],
    pages: state.pages || {},
  };

  if (!normalized.pages[pageKey]) {
    normalized.pages[pageKey] = { text: {}, layout: {}, windows: [] };
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
    if (layout.fontFamily !== undefined) {
      element.style.fontFamily = layout.fontFamily;
    }
  });
};

const collectPersonalizationState = () => {
  const state = normalizePersonalizationState(personalizationState || loadPersonalizationState());
  const page = state.pages[pageKey] || { text: {}, layout: {}, windows: [] };
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
    pageLayout[id] = {
      x: 0,
      y: 0,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      order: Number.parseInt(element.style.order || "", 10) || index + 1,
      fontFamily: element.style.fontFamily || "",
    };
  });

  state.version = 2;
  state.text = globalText;
  state.images = images;
  state.lists = lists;
  state.pages[pageKey] = {
    ...page,
    text: pageText,
    layout: pageLayout,
    windows: page.windows || [],
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
  indicator.innerHTML = `<strong>Developer Mode Active</strong><span>Drag cards into clean slots, resize, edit text, change fonts, and upload images.</span>`;
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

const getSiblingLayoutItems = (element) => {
  const parent = element.parentElement;
  if (!parent) {
    return [];
  }
  return Array.from(parent.children).filter((child) => child.classList?.contains("developer-editable"));
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

const snapEditableItemToSlot = (dragged, target) => {
  if (!dragged || !target || dragged === target) {
    return;
  }
  const siblings = getSiblingLayoutItems(target);
  if (!siblings.includes(dragged)) {
    return;
  }
  normalizeSiblingOrders(siblings);
  const draggedOrder = dragged.style.order;
  dragged.style.order = target.style.order;
  target.style.order = draggedOrder;
  savePersonalizationState();
};

const setupDragHandlers = (element) => {
  if (element.dataset.dragReady === "true") {
    return;
  }
  element.dataset.dragReady = "true";

  element.addEventListener("dragstart", (event) => {
    if (!developerModeEnabled) {
      event.preventDefault();
      return;
    }
    draggedEditableItem = element;
    element.classList.add("developer-editable--dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", getEditableId(element));
  });

  element.addEventListener("dragover", (event) => {
    if (!developerModeEnabled || !draggedEditableItem) {
      return;
    }
    if (getSiblingLayoutItems(element).includes(draggedEditableItem)) {
      event.preventDefault();
      element.classList.add("developer-editable--drop-target");
    }
  });

  element.addEventListener("dragleave", () => {
    element.classList.remove("developer-editable--drop-target");
  });

  element.addEventListener("drop", (event) => {
    if (!developerModeEnabled) {
      return;
    }
    event.preventDefault();
    element.classList.remove("developer-editable--drop-target");
    snapEditableItemToSlot(draggedEditableItem, element);
  });

  element.addEventListener("dragend", () => {
    element.classList.remove("developer-editable--dragging");
    document.querySelectorAll(".developer-editable--drop-target").forEach((item) => item.classList.remove("developer-editable--drop-target"));
    draggedEditableItem = null;
  });
};

const initializeEditableLayoutItems = () => {
  getEditableLayoutItems().forEach((element, index) => {
    getEditableId(element, index);
    element.classList.add("developer-editable");
    element.draggable = developerModeEnabled;
    setupDragHandlers(element);
  });
};

const removeCustomWindow = (windowId) => {
  const state = collectPersonalizationState();
  const page = state.pages[pageKey];
  page.windows = (page.windows || []).filter((windowItem) => windowItem.id !== windowId);
  delete page.layout[windowId];
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
    controls.append(
      createControlButton("↕ Drag", "Drag this window to snap into another clean slot", () => {}),
      createControlButton("↑", "Move earlier", () => moveEditableItem(element, -1)),
      createControlButton("↓", "Move later", () => moveEditableItem(element, 1)),
      createControlButton("Reset size", "Clear custom width and height", () => {
        element.style.width = "";
        element.style.height = "";
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
          <li>Drag a card/window onto another card/window to snap into that clean slot.</li>
          <li>Use the font dropdown on each window to change that window's font.</li>
          <li>Resize from the lower-right corner, then save before exiting.</li>
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
    element.draggable = enabled;
  });

  const customArea = document.querySelector("[data-developer-window-area]");
  if (customArea) {
    const hasWindows = Boolean(personalizationState?.pages?.[pageKey]?.windows?.length);
    customArea.hidden = !enabled && !hasWindows;
  }

  if (enabled) {
    addDeveloperControls();
  } else {
    removeDeveloperControls();
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
