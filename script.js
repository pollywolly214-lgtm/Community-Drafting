const STORAGE_KEY = "community-drafting-admin";
const AUTH_KEY = "community-drafting-admin-auth";
const ADMIN_BODY_CLASS = "admin-active";

const adminPanel = document.getElementById("admin-panel");
const adminSaveButton = document.getElementById("admin-save");
const adminExitButton = document.getElementById("admin-exit");
const adminUpdateTitle = document.getElementById("admin-update-title");
const adminUpdateBody = document.getElementById("admin-update-body");
const adminAddUpdate = document.getElementById("admin-add-update");
const adminImageInput = document.getElementById("admin-image-input");
const adminImageTitle = document.getElementById("admin-image-title");
const adminImageCategory = document.getElementById("admin-image-category");
const adminAddImage = document.getElementById("admin-add-image");

const isSettingsPage = document.body.classList.contains("page-settings");
let adminEnabled = false;
let activeImageTarget = null;

const isAuthenticated = () => localStorage.getItem(AUTH_KEY) === "true";

const buildEditableTextNodes = () => {
  const selector =
    "h1,h2,h3,h4,h5,h6,p,span,a,li,figcaption,strong,em,label,button";
  const nodes = Array.from(document.querySelectorAll(selector)).filter((node) => {
    if (node.closest(".admin-panel") || node.closest(".settings-shell")) {
      return false;
    }
    if (node.dataset.adminNoedit === "true") {
      return false;
    }
    if (!node.textContent.trim()) {
      return false;
    }
    return true;
  });

  nodes.forEach((node, index) => {
    node.dataset.adminEditable = "true";
    if (!node.dataset.adminKey) {
      node.dataset.adminKey = `auto-${index}`;
    }
  });

  return nodes;
};

const getEditableTextNodes = () =>
  Array.from(document.querySelectorAll("[data-admin-editable='true']"));

const getEditableImages = () =>
  Array.from(document.querySelectorAll("[data-admin-image]"));

const getEditableLists = () =>
  Array.from(document.querySelectorAll("[data-admin-list]"));

const getEditableGalleries = () =>
  Array.from(document.querySelectorAll("[data-admin-gallery]"));

const loadAdminState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
};

const applyAdminState = (state) => {
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
      if (key && state.images[key]) {
        img.src = state.images[key];
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

  if (state.galleries) {
    getEditableGalleries().forEach((gallery) => {
      const key = gallery.dataset.adminGallery;
      if (key && state.galleries[key]) {
        gallery.innerHTML = state.galleries[key];
      }
    });
  }
};

const collectAdminState = () => {
  const text = {};
  const images = {};
  const lists = {};
  const galleries = {};

  getEditableTextNodes().forEach((node) => {
    const key = node.dataset.adminKey;
    if (key) {
      text[key] = node.innerHTML.trim();
    }
  });

  getEditableImages().forEach((img) => {
    const key = img.dataset.adminImage;
    if (key) {
      images[key] = img.src;
    }
  });

  getEditableLists().forEach((list) => {
    const key = list.dataset.adminList;
    if (key) {
      lists[key] = list.innerHTML.trim();
    }
  });

  getEditableGalleries().forEach((gallery) => {
    const key = gallery.dataset.adminGallery;
    if (key) {
      galleries[key] = gallery.innerHTML.trim();
    }
  });

  return { text, images, lists, galleries };
};

const saveAdminState = () => {
  const state = collectAdminState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const setAdminMode = (enabled) => {
  adminEnabled = enabled;
  document.body.classList.toggle(ADMIN_BODY_CLASS, enabled);

  if (adminPanel) {
    adminPanel.setAttribute("aria-hidden", String(!enabled));
  }

  getEditableTextNodes().forEach((node) => {
    node.setAttribute("contenteditable", String(enabled));
  });
};

const requestAdminMode = () => {
  if (!isAuthenticated()) {
    window.alert("Please open Settings and click 'Login' first.");
    return;
  }
  setAdminMode(true);
};

const attachImageClickHandlers = () => {
  getEditableImages().forEach((img) => {
    img.addEventListener("click", () => {
      if (!adminEnabled || !adminImageInput) {
        return;
      }
      activeImageTarget = img;
      adminImageInput.click();
    });
  });
};

const addSettingsLauncher = () => {
  if (isSettingsPage) {
    return;
  }
  const launcher = document.createElement("a");
  launcher.className = "settings-launcher";
  launcher.href = `settings.html?return=${encodeURIComponent(
    window.location.pathname.split("/").pop() || "index.html"
  )}`;
  launcher.textContent = "⚙ Settings";
  launcher.setAttribute("aria-label", "Open admin settings");
  document.body.append(launcher);
};

const setupSettingsPage = () => {
  if (!isSettingsPage) {
    return;
  }

  const loginForm = document.getElementById("settings-login-form");
  const status = document.getElementById("settings-status");
  const returnLink = document.getElementById("settings-return-link");
  const logoutButton = document.getElementById("settings-logout");

  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("return") || "index.html";

  if (returnLink) {
    returnLink.href = `${returnTo}?admin=1`;
  }

  const updateStatus = () => {
    if (!status) {
      return;
    }
    status.textContent = isAuthenticated()
      ? "Logged in. You can now open any page in edit mode."
      : "Logged out. Click login to enable editing.";
  };

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      localStorage.setItem(AUTH_KEY, "true");
      updateStatus();
      window.alert("Login successful. No password required right now.");
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      localStorage.removeItem(AUTH_KEY);
      updateStatus();
    });
  }

  updateStatus();
};

buildEditableTextNodes();
applyAdminState(loadAdminState());
attachImageClickHandlers();
addSettingsLauncher();
setupSettingsPage();

const shouldAutoEnable =
  new URLSearchParams(window.location.search).get("admin") === "1" &&
  isAuthenticated();

if (shouldAutoEnable) {
  setAdminMode(true);
}

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "`") {
    event.preventDefault();
    if (adminEnabled) {
      setAdminMode(false);
    } else {
      requestAdminMode();
    }
  }
});

if (adminExitButton) {
  adminExitButton.addEventListener("click", () => {
    setAdminMode(false);
  });
}

if (adminSaveButton) {
  adminSaveButton.addEventListener("click", () => {
    saveAdminState();
    setAdminMode(false);
  });
}

if (adminAddUpdate) {
  adminAddUpdate.addEventListener("click", () => {
    const title = adminUpdateTitle ? adminUpdateTitle.value.trim() : "";
    const body = adminUpdateBody ? adminUpdateBody.value.trim() : "";
    if (!title || !body) {
      window.alert("Add both a title and details.");
      return;
    }
    const updatesList = document.querySelector("[data-admin-list='updates']");
    if (updatesList) {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `<h3>${title}</h3><p>${body}</p>`;
      updatesList.prepend(card);
      adminUpdateTitle.value = "";
      adminUpdateBody.value = "";
    }
  });
}

if (adminImageInput) {
  adminImageInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file || !activeImageTarget) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      activeImageTarget.src = reader.result;
      activeImageTarget = null;
      adminImageInput.value = "";
    };
    reader.readAsDataURL(file);
  });
}

if (adminAddImage) {
  adminAddImage.addEventListener("click", () => {
    if (!adminImageInput || !adminImageInput.files[0]) {
      window.alert("Choose an image first.");
      return;
    }

    const category = adminImageCategory ? adminImageCategory.value : "dashboard";
    const title = adminImageTitle && adminImageTitle.value.trim()
      ? adminImageTitle.value.trim()
      : "New project image";

    const targetGallery = document.querySelector(
      `[data-admin-gallery='${category}']`
    );

    if (!targetGallery) {
      window.alert("This page does not have that gallery section.");
      return;
    }

    const file = adminImageInput.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const figure = document.createElement("figure");
      figure.className = "image-card gradient-border";

      const imageKey = `${category}-${Date.now()}`;
      figure.innerHTML = `
        <img src="${reader.result}" alt="${title}" data-admin-image="${imageKey}" />
        <figcaption data-admin-editable="true" data-admin-key="${imageKey}-caption">${title}</figcaption>
      `;

      targetGallery.prepend(figure);
      attachImageClickHandlers();
      adminImageInput.value = "";
      if (adminImageTitle) {
        adminImageTitle.value = "";
      }
    };
    reader.readAsDataURL(file);
  });
}
