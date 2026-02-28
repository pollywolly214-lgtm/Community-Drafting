const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));

dropdowns.forEach((dropdown) => {
  const button = dropdown.querySelector(".nav-pill--button");
  if (!button) return;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = dropdown.classList.contains("is-open");
    dropdowns.forEach((item) => {
      item.classList.remove("is-open");
      const btn = item.querySelector(".nav-pill--button");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });

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
    dropdowns.forEach((dropdown) => {
      dropdown.classList.remove("is-open");
      const button = dropdown.querySelector(".nav-pill--button");
      if (button) button.setAttribute("aria-expanded", "false");
    });
  }
});

const ADMIN_PASSWORD = "abc";
const STORAGE_KEY = "community-drafting-admin";
const ADMIN_BODY_CLASS = "admin-active";

const adminPanel = document.getElementById("admin-panel");
const adminSaveButton = document.getElementById("admin-save");
const adminExitButton = document.getElementById("admin-exit");
const adminUpdateTitle = document.getElementById("admin-update-title");
const adminUpdateBody = document.getElementById("admin-update-body");
const adminAddUpdate = document.getElementById("admin-add-update");
const adminImageInput = document.getElementById("admin-image-input");

let adminEnabled = false;
let activeImageTarget = null;

const getEditableTextNodes = () =>
  Array.from(document.querySelectorAll("[data-admin-key]"));

const getEditableImages = () =>
  Array.from(document.querySelectorAll("[data-admin-image]"));

const getEditableLists = () =>
  Array.from(document.querySelectorAll("[data-admin-list]"));

const loadAdminState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
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
};

const collectAdminState = () => {
  const text = {};
  const images = {};
  const lists = {};

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

  return { text, images, lists };
};

const saveAdminState = () => {
  const state = collectAdminState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const setAdminMode = (enabled) => {
  adminEnabled = enabled;
  document.body.classList.toggle(ADMIN_BODY_CLASS, enabled);
  adminPanel.setAttribute("aria-hidden", String(!enabled));
  getEditableTextNodes().forEach((node) => {
    node.setAttribute("contenteditable", String(enabled));
  });
};

const requestAdminMode = () => {
  const response = window.prompt("Enter admin password");
  if (response === ADMIN_PASSWORD) {
    setAdminMode(true);
  } else if (response !== null) {
    window.alert("Incorrect password.");
  }
};

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

adminExitButton.addEventListener("click", () => {
  setAdminMode(false);
});

adminSaveButton.addEventListener("click", () => {
  saveAdminState();
  setAdminMode(false);
});

adminAddUpdate.addEventListener("click", () => {
  const title = adminUpdateTitle.value.trim();
  const body = adminUpdateBody.value.trim();
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

getEditableImages().forEach((img) => {
  img.addEventListener("click", () => {
    if (!adminEnabled) {
      return;
    }
    activeImageTarget = img;
    adminImageInput.click();
  });
});

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

applyAdminState(loadAdminState());
