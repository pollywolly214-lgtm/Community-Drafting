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


const markCurrentNavigation = () => {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-pill[href], .nav-cta[href]").forEach((link) => {
    const linkPage = link.getAttribute("href").split("#")[0].split("?")[0] || "index.html";

    if (linkPage === currentPage) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });
};

markCurrentNavigation();

const DEVELOPER_PASSWORD = "abc";
const PERSONALIZATION_STORAGE_KEY = "draftingSiteTextPersonalizationV1";
const LEGACY_PERSONALIZATION_STORAGE_KEY = "draftingSitePersonalizationV1";
const DEVELOPER_BODY_CLASS = "developer-mode-active";
const EDITABLE_REGION_SELECTOR = ".hero-content, .hero-card, main > .section, .grid > .card, .image-grid > .image-card, .project-card, .profile-card";
const EDITABLE_TEXT_SELECTOR = "h1, h2, h3, h4, p, figcaption, li, span[data-admin-key], a[href^='mailto:']";

let adminPanel = document.getElementById("admin-panel");
let adminSaveButton = document.getElementById("admin-save");
let adminExitButton = document.getElementById("admin-exit");
let developerModeEnabled = false;
let personalizationState = { version: 1, pages: {} };

const pageKey = window.location.pathname.split("/").pop() || "index.html";

const sanitizeStorageState = (state = {}) => ({
  version: 1,
  updatedAt: state.updatedAt || new Date().toISOString(),
  pages: state.pages && typeof state.pages === "object" ? state.pages : {},
});

const getPageState = () => {
  if (!personalizationState.pages[pageKey]) {
    personalizationState.pages[pageKey] = { text: {} };
  }
  if (!personalizationState.pages[pageKey].text) {
    personalizationState.pages[pageKey].text = {};
  }
  return personalizationState.pages[pageKey];
};

const loadPersonalizationState = () => {
  const raw = localStorage.getItem(PERSONALIZATION_STORAGE_KEY) || localStorage.getItem(LEGACY_PERSONALIZATION_STORAGE_KEY);
  if (!raw) return sanitizeStorageState();

  try {
    return sanitizeStorageState(JSON.parse(raw));
  } catch (error) {
    console.warn("Unable to parse saved developer-mode text edits.", error);
    return sanitizeStorageState();
  }
};

const savePersonalizationState = () => {
  personalizationState.updatedAt = new Date().toISOString();
  localStorage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(personalizationState));
};

const makeSlug = (value, fallback) => {
  const slug = String(value || "")
    .trim()
    .slice(0, 48)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || fallback;
};

const getRegionId = (region, index) => {
  if (!region.dataset.developerTextRegionId) {
    const heading = region.querySelector("h1, h2, h3, h4");
    region.dataset.developerTextRegionId = `${pageKey}:${makeSlug(heading?.textContent || region.className || region.tagName, `region-${index}`)}`;
  }
  return region.dataset.developerTextRegionId;
};

const getTextNodeId = (node, regionId, index) => {
  if (node.dataset.adminKey) return `global:${node.dataset.adminKey}`;
  if (!node.dataset.developerTextId) {
    node.dataset.developerTextId = `${regionId}:text-${makeSlug(node.textContent, String(index))}`;
  }
  return node.dataset.developerTextId;
};

const getEditableTextNodes = () => {
  const nodes = [];
  document.querySelectorAll(EDITABLE_REGION_SELECTOR).forEach((region, regionIndex) => {
    const regionId = getRegionId(region, regionIndex);
    region.querySelectorAll(EDITABLE_TEXT_SELECTOR).forEach((node, nodeIndex) => {
      if (node.closest(".admin-panel") || node.closest(".settings-dropdown") || node.closest("button") || node.closest("nav")) return;
      getTextNodeId(node, regionId, nodeIndex);
      nodes.push(node);
    });
  });
  return nodes;
};

const applyPersonalizationState = () => {
  const pageText = getPageState().text;
  getEditableTextNodes().forEach((node) => {
    const textId = node.dataset.developerTextId;
    if (textId && Object.prototype.hasOwnProperty.call(pageText, textId)) {
      node.innerHTML = pageText[textId];
    }
  });
};

const collectTextEdits = () => {
  const page = getPageState();
  getEditableTextNodes().forEach((node) => {
    const textId = node.dataset.developerTextId;
    if (textId) page.text[textId] = node.innerHTML.trim();
  });
};

const saveTextEdits = () => {
  collectTextEdits();
  savePersonalizationState();
};

const createSettingsMenu = () => {
  const navBar = document.querySelector(".nav-bar");
  if (!navBar || document.querySelector(".settings-dropdown")) return;

  const settingsDropdown = document.createElement("div");
  settingsDropdown.className = "nav-dropdown settings-dropdown";
  settingsDropdown.innerHTML = `
    <button class="nav-pill nav-pill--button settings-button" type="button" aria-expanded="false" aria-haspopup="true" aria-label="Open settings menu">⚙ Settings</button>
    <div class="nav-dropdown-menu gradient-border settings-menu">
      <button class="settings-menu__item" id="developer-mode-toggle" type="button">Open Developer Mode</button>
      <p class="settings-menu__note">Text editing only. Saved in this browser.</p>
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
    developerModeEnabled ? saveAndExitDeveloperMode() : requestDeveloperMode();
  });

  dropdowns.push(settingsDropdown);
};


const ensureAdminPanel = () => {
  if (!adminPanel) {
    adminPanel = document.createElement("div");
    adminPanel.className = "admin-panel";
    adminPanel.id = "admin-panel";
    adminPanel.setAttribute("aria-hidden", "true");
    adminPanel.innerHTML = `
      <div class="admin-panel__header">
        <div>
          <p class="admin-label">Developer Mode</p>
          <h3>Text editor</h3>
        </div>
        <div class="admin-actions">
          <button class="secondary" id="admin-save" type="button">Save & Exit</button>
          <button class="ghost" id="admin-exit" type="button">Close</button>
        </div>
      </div>
      <div class="admin-panel__body"></div>
      <p class="admin-footer"></p>
    `;
    document.body.append(adminPanel);
  }

  adminSaveButton = document.getElementById("admin-save");
  adminExitButton = document.getElementById("admin-exit");
  if (adminSaveButton?.dataset.developerHandlerReady !== "true") {
    adminSaveButton.dataset.developerHandlerReady = "true";
    adminSaveButton.addEventListener("click", saveAndExitDeveloperMode);
  }
  if (adminExitButton?.dataset.developerHandlerReady !== "true") {
    adminExitButton.dataset.developerHandlerReady = "true";
    adminExitButton.addEventListener("click", saveAndExitDeveloperMode);
  }
};

const updateDeveloperToggleLabel = () => {
  const toggle = document.getElementById("developer-mode-toggle");
  if (toggle) toggle.textContent = developerModeEnabled ? "Save & Exit Developer Mode" : "Open Developer Mode";
};

const updateAdminPanelCopy = () => {
  if (!adminPanel) return;
  adminPanel.querySelector(".admin-label")?.replaceChildren(document.createTextNode("Developer Mode"));
  adminPanel.querySelector("h3")?.replaceChildren(document.createTextNode("Text editor"));
  if (adminSaveButton) adminSaveButton.textContent = "Save & Exit";
  if (adminExitButton) {
    adminExitButton.hidden = false;
    adminExitButton.textContent = "Close";
  }
  const body = adminPanel.querySelector(".admin-panel__body");
  if (body) {
    body.innerHTML = `
      <div class="admin-card admin-card--wide">
        <h4>Barebones text editing</h4>
        <ul>
          <li>Click highlighted text anywhere on the page and type your changes.</li>
          <li>Click <strong>Save & Exit</strong> or <strong>Close</strong> to save changes.</li>
          <li>Saved text stays visible after refreshing this browser.</li>
        </ul>
      </div>
    `;
  }
  const footer = adminPanel.querySelector(".admin-footer");
  if (footer) footer.textContent = "Only text editing is enabled in Developer Mode.";
};

const handleEditableTextBlur = () => {
  if (developerModeEnabled) saveTextEdits();
};

const handleEditableTextKeydown = (event) => {
  if (!developerModeEnabled) return;
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
      node.addEventListener("input", () => {
        if (developerModeEnabled) saveTextEdits();
      });
    }
  });
};

const setDeveloperMode = (enabled) => {
  ensureAdminPanel();
  developerModeEnabled = enabled;
  document.body.classList.toggle(DEVELOPER_BODY_CLASS, enabled);
  document.body.classList.remove("admin-active");
  adminPanel?.setAttribute("aria-hidden", String(!enabled));
  updateAdminPanelCopy();
  updateDeveloperToggleLabel();
  setEditableTextMode(enabled);
};

const requestDeveloperMode = () => {
  const response = window.prompt("Enter Developer Mode password");
  if (response === DEVELOPER_PASSWORD) {
    setDeveloperMode(true);
  } else if (response !== null) {
    window.alert("Incorrect password. Developer Mode was not enabled.");
  }
};

const saveAndExitDeveloperMode = () => {
  saveTextEdits();
  setDeveloperMode(false);
};

ensureAdminPanel();

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "`") {
    event.preventDefault();
    developerModeEnabled ? saveAndExitDeveloperMode() : requestDeveloperMode();
  }
});

createSettingsMenu();
personalizationState = loadPersonalizationState();
applyPersonalizationState();
setDeveloperMode(false);
