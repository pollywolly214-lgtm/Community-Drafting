const dropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));

dropdowns.forEach((dropdown) => {
  const button = dropdown.querySelector('.nav-pill--button');
  if (!button) return;

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = dropdown.classList.contains('is-open');

    dropdowns.forEach((item) => {
      item.classList.remove('is-open');
      const btn = item.querySelector('.nav-pill--button');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      dropdown.classList.add('is-open');
      button.setAttribute('aria-expanded', 'true');
    }
  });
});

document.addEventListener('click', (event) => {
  dropdowns.forEach((dropdown) => {
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove('is-open');
      const button = dropdown.querySelector('.nav-pill--button');
      if (button) button.setAttribute('aria-expanded', 'false');
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    dropdowns.forEach((dropdown) => {
      dropdown.classList.remove('is-open');
      const button = dropdown.querySelector('.nav-pill--button');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  }
});

const CYLINDER_ITEMS = [
  {
    title: '3D Modeling',
    label: 'Fabrication Ready',
    description: 'Production-grade modeling with clean dimensions, iteration rounds, and files that move directly into fabrication planning.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Explore service',
    ctaHref: 'service-3d-modeling.html',
    theme: '#66bbff',
  },
  {
    title: '2D Modeling',
    label: 'Field Documentation',
    description: 'Accurate 2D drawing sets for permit use, install coordination, and clear communication between teams.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Learn more',
    ctaHref: 'service-2d-modeling.html',
    theme: '#7c86ff',
  },
  {
    title: '3D Printing',
    label: 'Prototype Fast',
    description: 'Functional and visual prototypes for concept validation, fit checks, and stakeholder demos.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'See printing',
    ctaHref: 'service-3d-printing.html',
    theme: '#67d2ff',
  },
  {
    title: 'On-Site Visit',
    label: 'Scope with Confidence',
    description: 'We visit your site, gather details, and align deliverables before drafting begins.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Schedule visit',
    ctaHref: 'schedule-visit.html',
    theme: '#8d9eff',
  },
  {
    title: 'Designer Call',
    label: 'Direct Collaboration',
    description: 'Talk with a designer directly, define your target outcome, and receive a clear fixed-price quote.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Call now',
    ctaHref: 'call-designer.html',
    theme: '#4ea8ff',
  },
];

const CYLINDER_CONFIG = {
  radiusDesktop: 360,
  radiusTablet: 290,
  radiusMobile: 225,
  panelWidthDesktop: 280,
  panelWidthTablet: 240,
  panelWidthMobile: 200,
  panelHeightDesktop: 360,
  panelHeightTablet: 320,
  panelHeightMobile: 280,
  scrollDistanceVh: 380,
  activeEmphasis: {
    minOpacity: 0.16,
    maxOpacity: 1,
    minScale: 0.78,
    maxScale: 1.03,
  },
};

const initCylinderSection = () => {
  const section = document.querySelector('[data-cylinder-scroll]');
  if (!section) return;

  const canvasHost = section.querySelector('[data-cylinder-stage]');
  const detailCard = section.querySelector('[data-cylinder-detail]');
  const fallback = document.querySelector('[data-cylinder-fallback]');

  if (!canvasHost || !detailCard || !window.THREE) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = Boolean(window.gsap && window.ScrollTrigger);

  if (prefersReducedMotion || !hasGsap) {
    section.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  if (fallback) fallback.hidden = true;

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  const titleEl = detailCard.querySelector('.cylinder-detail-card__title');
  const labelEl = detailCard.querySelector('.cylinder-detail-card__label');
  const descriptionEl = detailCard.querySelector('.cylinder-detail-card__description');
  const ctaEl = detailCard.querySelector('.cylinder-detail-card__cta');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 3000);
  camera.position.set(0, 20, 930);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvasHost.appendChild(renderer.domElement);

  const lightingGroup = new THREE.Group();
  scene.add(lightingGroup);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  const keyLight = new THREE.DirectionalLight(0xb9d7ff, 1.25);
  keyLight.position.set(130, 160, 240);
  const rimLight = new THREE.DirectionalLight(0x9db0ff, 0.8);
  rimLight.position.set(-180, 30, -260);
  lightingGroup.add(ambientLight, keyLight, rimLight);

  const cylinderGroup = new THREE.Group();
  scene.add(cylinderGroup);

  const items = CYLINDER_ITEMS;
  const angleStep = (Math.PI * 2) / items.length;
  const panelMeta = [];

  const dimensions = () => {
    const width = window.innerWidth;
    if (width <= 640) {
      return {
        radius: CYLINDER_CONFIG.radiusMobile,
        panelWidth: CYLINDER_CONFIG.panelWidthMobile,
        panelHeight: CYLINDER_CONFIG.panelHeightMobile,
      };
    }
    if (width <= 1024) {
      return {
        radius: CYLINDER_CONFIG.radiusTablet,
        panelWidth: CYLINDER_CONFIG.panelWidthTablet,
        panelHeight: CYLINDER_CONFIG.panelHeightTablet,
      };
    }
    return {
      radius: CYLINDER_CONFIG.radiusDesktop,
      panelWidth: CYLINDER_CONFIG.panelWidthDesktop,
      panelHeight: CYLINDER_CONFIG.panelHeightDesktop,
    };
  };

  const loadTexture = new THREE.TextureLoader();

  items.forEach((item, index) => {
    const texture = loadTexture.load(item.image);
    texture.colorSpace = THREE.SRGBColorSpace;

    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = 1024;
    cardCanvas.height = 1280;
    const ctx = cardCanvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, cardCanvas.width, cardCanvas.height);
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(1, 'rgba(227,240,255,0.92)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, cardCanvas.width, cardCanvas.height);

      ctx.fillStyle = item.theme || '#6f7cff';
      ctx.fillRect(0, 0, cardCanvas.width, 46);

      ctx.drawImage(texture.image, 84, 100, 856, 560);

      ctx.fillStyle = '#25507f';
      ctx.font = '600 46px Plus Jakarta Sans, Arial';
      ctx.fillText(item.label, 84, 760);

      ctx.fillStyle = '#10253f';
      ctx.font = '700 72px Fraunces, Georgia';
      ctx.fillText(item.title, 84, 860);

      ctx.fillStyle = '#2f445c';
      ctx.font = '500 40px Plus Jakarta Sans, Arial';
      const words = item.description.split(' ');
      let line = '';
      let y = 940;
      words.forEach((word) => {
        const proposal = `${line}${word} `;
        if (ctx.measureText(proposal).width > 840) {
          ctx.fillText(line, 84, y);
          line = `${word} `;
          y += 50;
        } else {
          line = proposal;
        }
      });
      if (line) ctx.fillText(line, 84, y);
    }

    const panelTexture = new THREE.CanvasTexture(cardCanvas);
    panelTexture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshPhysicalMaterial({
      map: panelTexture,
      roughness: 0.28,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.35,
      transparent: true,
      opacity: CYLINDER_CONFIG.activeEmphasis.maxOpacity,
      side: THREE.DoubleSide,
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    cylinderGroup.add(plane);

    panelMeta.push({ plane, material, angle: index * angleStep, item, texture: panelTexture });
  });

  let activeIndex = 0;

  const updateDetails = (nextIndex) => {
    if (nextIndex === activeIndex || !items[nextIndex]) return;
    activeIndex = nextIndex;
    const active = items[nextIndex];

    labelEl.textContent = active.label;
    titleEl.textContent = active.title;
    descriptionEl.textContent = active.description;
    ctaEl.textContent = active.ctaLabel;
    ctaEl.setAttribute('href', active.ctaHref);

    gsap.fromTo(
      detailCard,
      { y: 10, opacity: 0.7 },
      { y: 0, opacity: 1, duration: 0.3, overwrite: true, ease: 'power2.out' },
    );
  };

  const applyLayout = () => {
    const rect = canvasHost.getBoundingClientRect();
    const { radius, panelWidth, panelHeight } = dimensions();
    const width = Math.max(rect.width, 280);
    const height = Math.max(rect.height, 320);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    panelMeta.forEach(({ plane, angle }) => {
      plane.geometry.dispose();
      plane.geometry = new THREE.PlaneGeometry(panelWidth, panelHeight, 1, 1);
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      plane.position.set(x, 0, z);
      plane.lookAt(0, 0, 0);
    });
  };

  const updatePanelEmphasis = () => {
    let closest = 0;
    let highestFocus = -Infinity;

    panelMeta.forEach(({ plane, material }, index) => {
      const worldPos = new THREE.Vector3();
      plane.getWorldPosition(worldPos);
      const frontness = THREE.MathUtils.clamp((worldPos.z + 520) / 980, 0, 1);
      const opacity = THREE.MathUtils.lerp(
        CYLINDER_CONFIG.activeEmphasis.minOpacity,
        CYLINDER_CONFIG.activeEmphasis.maxOpacity,
        frontness,
      );
      const scale = THREE.MathUtils.lerp(
        CYLINDER_CONFIG.activeEmphasis.minScale,
        CYLINDER_CONFIG.activeEmphasis.maxScale,
        frontness,
      );

      plane.scale.setScalar(scale);
      material.opacity = opacity;

      if (frontness > highestFocus) {
        highestFocus = frontness;
        closest = index;
      }
    });

    updateDetails(closest);
  };

  const state = { rotationProgress: 0 };

  const render = () => {
    cylinderGroup.rotation.y = -state.rotationProgress * Math.PI * 2;
    updatePanelEmphasis();
    renderer.render(scene, camera);
  };

  const animation = gsap.to(state, {
    rotationProgress: items.length > 1 ? (items.length - 1) / items.length : 1,
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      pin: true,
      scrub: 1,
      start: 'top top',
      end: `+=${window.innerHeight * (CYLINDER_CONFIG.scrollDistanceVh / 100)}`,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: render,
      onRefresh: applyLayout,
    },
  });

  const handleResize = () => {
    applyLayout();
    render();
  };

  window.addEventListener('resize', handleResize);

  applyLayout();
  render();

  const destroy = () => {
    window.removeEventListener('resize', handleResize);
    animation.kill();
    panelMeta.forEach(({ plane, material, texture }) => {
      plane.geometry.dispose();
      material.dispose();
      texture.dispose();
    });
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  };

  window.addEventListener('beforeunload', destroy, { once: true });
};

const ADMIN_PASSWORD = 'abc';
const STORAGE_KEY = 'community-drafting-admin';
const ADMIN_BODY_CLASS = 'admin-active';

const adminPanel = document.getElementById('admin-panel');
const adminSaveButton = document.getElementById('admin-save');
const adminExitButton = document.getElementById('admin-exit');
const adminUpdateTitle = document.getElementById('admin-update-title');
const adminUpdateBody = document.getElementById('admin-update-body');
const adminAddUpdate = document.getElementById('admin-add-update');
const adminImageInput = document.getElementById('admin-image-input');

let adminEnabled = false;
let activeImageTarget = null;

const getEditableTextNodes = () => Array.from(document.querySelectorAll('[data-admin-key]'));
const getEditableImages = () => Array.from(document.querySelectorAll('[data-admin-image]'));
const getEditableLists = () => Array.from(document.querySelectorAll('[data-admin-list]'));

const loadAdminState = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const applyAdminState = (state) => {
  if (!state) return;
  if (state.text) {
    getEditableTextNodes().forEach((node) => {
      const key = node.dataset.adminKey;
      if (key && state.text[key]) node.innerHTML = state.text[key];
    });
  }
  if (state.images) {
    getEditableImages().forEach((img) => {
      const key = img.dataset.adminImage;
      if (key && state.images[key]) img.src = state.images[key];
    });
  }
  if (state.lists) {
    getEditableLists().forEach((list) => {
      const key = list.dataset.adminList;
      if (key && state.lists[key]) list.innerHTML = state.lists[key];
    });
  }
};

const collectAdminState = () => {
  const text = {};
  const images = {};
  const lists = {};

  getEditableTextNodes().forEach((node) => {
    const key = node.dataset.adminKey;
    if (key) text[key] = node.innerHTML.trim();
  });

  getEditableImages().forEach((img) => {
    const key = img.dataset.adminImage;
    if (key) images[key] = img.src;
  });

  getEditableLists().forEach((list) => {
    const key = list.dataset.adminList;
    if (key) lists[key] = list.innerHTML.trim();
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
  if (adminPanel) adminPanel.setAttribute('aria-hidden', String(!enabled));
  getEditableTextNodes().forEach((node) => {
    node.setAttribute('contenteditable', String(enabled));
  });
};

const requestAdminMode = () => {
  const response = window.prompt('Enter admin password');
  if (response === ADMIN_PASSWORD) {
    setAdminMode(true);
  } else if (response !== null) {
    window.alert('Incorrect password.');
  }
};

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.key === '`') {
    event.preventDefault();
    if (adminEnabled) {
      setAdminMode(false);
    } else {
      requestAdminMode();
    }
  }
});

if (adminExitButton) {
  adminExitButton.addEventListener('click', () => {
    setAdminMode(false);
  });
}

if (adminSaveButton) {
  adminSaveButton.addEventListener('click', () => {
    saveAdminState();
    setAdminMode(false);
  });
}

if (adminAddUpdate && adminUpdateTitle && adminUpdateBody) {
  adminAddUpdate.addEventListener('click', () => {
    const title = adminUpdateTitle.value.trim();
    const body = adminUpdateBody.value.trim();
    if (!title || !body) {
      window.alert('Add both a title and details.');
      return;
    }
    const updatesList = document.querySelector("[data-admin-list='updates']");
    if (updatesList) {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `<h3>${title}</h3><p>${body}</p>`;
      updatesList.prepend(card);
      adminUpdateTitle.value = '';
      adminUpdateBody.value = '';
    }
  });
}

if (adminImageInput) {
  getEditableImages().forEach((img) => {
    img.addEventListener('click', () => {
      if (!adminEnabled) return;
      activeImageTarget = img;
      adminImageInput.click();
    });
  });

  adminImageInput.addEventListener('change', (event) => {
    const [file] = event.target.files || [];
    if (!file || !activeImageTarget) return;
    const reader = new FileReader();
    reader.onload = () => {
      activeImageTarget.src = reader.result;
      activeImageTarget = null;
      adminImageInput.value = '';
    };
    reader.readAsDataURL(file);
  });
}

applyAdminState(loadAdminState());
initCylinderSection();
