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
const LEGACY_ADMIN_STORAGE_KEY = "community-drafting-admin";
const DEVELOPER_BODY_CLASS = "developer-mode-active";
const EDITABLE_SELECTOR = ".hero-content, .hero-card, main > .section, .grid > .card, .image-grid > .image-card";

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

const pageKey = window.location.pathname.split("/").pop() || "index.html";

const getEditableTextNodes = () => Array.from(document.querySelectorAll("[data-admin-key]"));
const getEditableImages = () => Array.from(document.querySelectorAll("[data-admin-image]"));
const getEditableLists = () => Array.from(document.querySelectorAll("[data-admin-list]"));
const getEditableLayoutItems = () => Array.from(document.querySelectorAll(EDITABLE_SELECTOR));

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

const initializeEditableLayoutItems = () => {
  getEditableLayoutItems().forEach((element, index) => {
    getEditableId(element, index);
    element.classList.add("developer-editable");
  });
};

const loadPersonalizationState = () => {
  const raw = localStorage.getItem(PERSONALIZATION_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn("Unable to parse saved personalization state.", error);
    }
  }

  const legacyRaw = localStorage.getItem(LEGACY_ADMIN_STORAGE_KEY);
  if (!legacyRaw) {
    return null;
  }

  try {
    const legacyState = JSON.parse(legacyRaw);
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      images: Object.fromEntries(
        Object.entries(legacyState.images || {}).map(([key, src]) => [key, { src, filename: "legacy-upload" }]),
      ),
      layout: {},
      text: legacyState.text || {},
      lists: legacyState.lists || {},
    };
  } catch (error) {
    return null;
  }
};

const applyPersonalizationState = (state) => {
  if (!state) {
    return;
  }

  if (state.text) {
    getEditableTextNodes().forEach((node) => {
      const key = node.dataset.adminKey;
      if (key && state.text[key]) {
        node.innerHTML = state.text[key];
      }
    });
  }

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

  if (state.layout) {
    initializeEditableLayoutItems();
    getEditableLayoutItems().forEach((element, index) => {
      const id = getEditableId(element, index);
      const layout = state.layout[id];
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
      if (Number.isFinite(layout.x)) {
        element.dataset.developerX = String(layout.x);
      }
      if (Number.isFinite(layout.y)) {
        element.dataset.developerY = String(layout.y);
      }
    });
  }
};

const collectPersonalizationState = () => {
  const text = {};
  const images = {};
  const lists = {};
  const layout = {};

  getEditableTextNodes().forEach((node) => {
    const key = node.dataset.adminKey;
    if (key) {
      text[key] = node.innerHTML.trim();
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
    layout[id] = {
      x: Number(element.dataset.developerX || 0),
      y: Number(element.dataset.developerY || 0),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      order: Number.parseInt(element.style.order || "", 10) || index + 1,
    };
  });

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    images,
    layout,
    text,
    lists,
  };
};

const savePersonalizationState = () => {
  const state = collectPersonalizationState();
  localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(state));
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
  indicator.innerHTML = `<strong>Developer Mode Active</strong><span>Resize sections, move cards, and upload images.</span>`;
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
  const targetIndex = currentIndex + direction;
  const target = sorted[targetIndex];
  if (!target) {
    return;
  }
  const currentOrder = element.style.order;
  element.style.order = target.style.order;
  target.style.order = currentOrder;
};

const addDeveloperControls = () => {
  initializeEditableLayoutItems();
  getEditableLayoutItems().forEach((element) => {
    if (element.querySelector(":scope > .developer-controls")) {
      return;
    }

    const controls = document.createElement("div");
    controls.className = "developer-controls";
    controls.append(
      createControlButton("↑", "Move earlier", () => moveEditableItem(element, -1)),
      createControlButton("↓", "Move later", () => moveEditableItem(element, 1)),
      createControlButton("Reset size", "Clear custom width and height", () => {
        element.style.width = "";
        element.style.height = "";
      }),
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

    element.prepend(controls);
  });
};

const removeDeveloperControls = () => {
  document.querySelectorAll(".developer-controls").forEach((control) => control.remove());
};

const updateAdminPanelCopy = () => {
  if (!adminPanel) {
    return;
  }

  const label = adminPanel.querySelector(".admin-label");
  const heading = adminPanel.querySelector("h3");
  const tips = adminPanel.querySelector(".admin-card ul");
  const footer = adminPanel.querySelector(".admin-footer");

  if (label) label.textContent = "Developer Mode Active";
  if (heading) heading.textContent = "Personalize this page";
  if (adminSaveButton) adminSaveButton.textContent = "Exit Developer Mode & Save";
  if (adminExitButton) adminExitButton.textContent = "Exit without saving";
  if (tips) {
    tips.innerHTML = `
      <li>Click text on the page to edit it directly.</li>
      <li>Click an editable image or use Upload image to replace it.</li>
      <li>Drag the lower-right corner of highlighted sections/cards to resize.</li>
      <li>Use ↑ and ↓ to reorganize editable cards/sections.</li>
    `;
  }
  if (footer) {
    footer.innerHTML = `Saved locally with <strong>${PERSONALIZATION_STORAGE_KEY}</strong>. GitHub sync needs a server-side endpoint.`;
  }
};

const setDeveloperMode = (enabled) => {
  developerModeEnabled = enabled;
  document.body.classList.toggle(DEVELOPER_BODY_CLASS, enabled);
  adminPanel?.setAttribute("aria-hidden", String(!enabled));
  createDeveloperModeIndicator();
  updateAdminPanelCopy();

  getEditableTextNodes().forEach((node) => {
    node.setAttribute("contenteditable", String(enabled));
  });

  getEditableLayoutItems().forEach((element) => {
    element.classList.toggle("developer-editable--active", enabled);
  });

  if (enabled) {
    addDeveloperControls();
  } else {
    removeDeveloperControls();
  }
};

const requestDeveloperMode = () => {
  const response = window.prompt("Enter Developer Mode password");
  if (response === DEVELOPER_PASSWORD) {
    setDeveloperMode(true);
  } else if (response !== null) {
    window.alert("Incorrect password. Developer Mode was not enabled.");
  }
};

const saveAndExitDeveloperMode = async () => {
  savePersonalizationState();
  setDeveloperMode(false);
  const githubResult = await syncPersonalizationToGitHub();
  if (!githubResult.ok) {
    console.info(githubResult.reason);
  }
};

adminExitButton?.addEventListener("click", () => {
  setDeveloperMode(false);
});

adminSaveButton?.addEventListener("click", () => {
  saveAndExitDeveloperMode();
});

adminAddUpdate?.addEventListener("click", () => {
  const title = adminUpdateTitle?.value.trim();
  const body = adminUpdateBody?.value.trim();
  if (!title || !body) {
    window.alert("Add both a title and details.");
    return;
  }
  const updatesList = document.querySelector("[data-admin-list='updates']");
  if (updatesList) {
    const card = document.createElement("article");
    card.className = "card developer-editable developer-editable--active";
    card.dataset.developerId = `${pageKey}:update-${Date.now()}`;
    card.innerHTML = `<h3>${title}</h3><p>${body}</p>`;
    updatesList.prepend(card);
    adminUpdateTitle.value = "";
    adminUpdateBody.value = "";
    addDeveloperControls();
  }
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
initializeEditableLayoutItems();
applyPersonalizationState(loadPersonalizationState());
