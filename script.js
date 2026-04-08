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

const CYLINDER_ITEMS = [
  {
    title: '3D Modeling',
    subtitle: 'Fabrication Ready',
    description: 'Production-grade models and shop-ready outputs prepared for real fabrication workflows.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Explore service',
    ctaHref: 'service-3d-modeling.html',
    theme: '#63b8ff',
  },
  {
    title: '2D Modeling',
    subtitle: 'Field Documentation',
    description: 'Clear 2D layouts and detailed notes for permit packets, install teams, and scope alignment.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'View details',
    ctaHref: 'service-2d-modeling.html',
    theme: '#8a8dff',
  },
  {
    title: '3D Printing',
    subtitle: 'Rapid Prototype',
    description: 'Functional prototypes and presentation models for fit checks and high-confidence reviews.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'See prints',
    ctaHref: 'service-3d-printing.html',
    theme: '#5fd5ff',
  },
  {
    title: 'On-Site Visit',
    subtitle: 'Measured Scope',
    description: 'In-person measurements and project clarification to prevent rework and keep delivery clean.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Schedule visit',
    ctaHref: 'schedule-visit.html',
    theme: '#95a6ff',
  },
  {
    title: 'Direct Designer Call',
    subtitle: 'Fast Quotes',
    description: 'Speak directly with a designer and receive a fixed-price path tailored to your project goals.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Call now',
    ctaHref: 'call-designer.html',
    theme: '#72b3ff',
  },
];

const CYLINDER_CONFIG = {
  radiusDesktop: 350,
  radiusTablet: 285,
  radiusMobile: 220,
  panelWidthDesktop: 280,
  panelWidthTablet: 230,
  panelWidthMobile: 190,
  panelHeightDesktop: 360,
  panelHeightTablet: 315,
  panelHeightMobile: 270,
  scrollDistanceVh: 360,
  frontLiftScale: 1.05,
  sideScale: 0.8,
  backOpacity: 0.13,
  frontOpacity: 1,
};

const fillDetail = (container, item) => {
  if (!container || !item) return;
  const label = container.querySelector('.cylinder-detail-card__label');
  const title = container.querySelector('.cylinder-detail-card__title');
  const description = container.querySelector('.cylinder-detail-card__description');
  const cta = container.querySelector('.cylinder-detail-card__cta');

  if (label) label.textContent = item.subtitle;
  if (title) title.textContent = item.title;
  if (description) description.textContent = item.description;
  if (cta) {
    cta.textContent = item.ctaLabel;
    cta.setAttribute('href', item.ctaHref);
  }
};

const initCylinder = () => {
  const section = document.querySelector('.cylinder-section');
  const cylinderScroll = document.querySelector('[data-cylinder-scroll]');
  const stage = document.querySelector('[data-cylinder-stage]');
  const detail = document.querySelector('[data-cylinder-detail]');
  const fallback = document.querySelector('[data-cylinder-fallback]');

  if (!section || !cylinderScroll || !stage || !detail) return;

  fillDetail(detail, CYLINDER_ITEMS[0]);
  section.classList.remove('is-enhanced');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !window.THREE || !window.gsap || !window.ScrollTrigger) {
    console.warn('[cylinder] Falling back to static cards (reduced motion or missing dependencies).');
    return;
  }

  const { THREE, gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 3000);
  camera.position.set(0, 10, 900);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('[cylinder] WebGL renderer failed; keeping fallback cards visible.', error);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width < 40 || stageRect.height < 40) {
    console.warn('[cylinder] Stage has invalid size; keeping fallback cards visible.');
    renderer.dispose();
    return;
  }

  const group = new THREE.Group();
  scene.add(group);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const keyLight = new THREE.DirectionalLight(0xd9ebff, 1.15);
  keyLight.position.set(120, 170, 260);
  scene.add(keyLight);
  const rim = new THREE.DirectionalLight(0x9caeff, 0.72);
  rim.position.set(-200, 40, -200);
  scene.add(rim);

  const panels = [];
  const angleStep = (Math.PI * 2) / CYLINDER_ITEMS.length;

  const getDimensions = () => {
    const w = window.innerWidth;
    if (w < 680) {
      return {
        radius: CYLINDER_CONFIG.radiusMobile,
        panelWidth: CYLINDER_CONFIG.panelWidthMobile,
        panelHeight: CYLINDER_CONFIG.panelHeightMobile,
      };
    }
    if (w < 1024) {
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

  const createCardTexture = (item) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(255,255,255,0.97)');
      gradient.addColorStop(1, 'rgba(228,242,255,0.93)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = item.theme;
      ctx.fillRect(0, 0, canvas.width, 52);

      ctx.fillStyle = 'rgba(203,224,245,0.85)';
      ctx.fillRect(80, 94, 864, 564);

      ctx.fillStyle = '#265686';
      ctx.font = '600 46px Plus Jakarta Sans, Arial';
      ctx.fillText(item.subtitle, 80, 760);

      ctx.fillStyle = '#10263f';
      ctx.font = '700 72px Fraunces, Georgia';
      ctx.fillText(item.title, 80, 860);

      ctx.fillStyle = '#2f445c';
      ctx.font = '500 40px Plus Jakarta Sans, Arial';
      const words = item.description.split(' ');
      let line = '';
      let y = 948;
      words.forEach((word) => {
        const next = `${line}${word} `;
        if (ctx.measureText(next).width > 840) {
          ctx.fillText(line, 80, y);
          line = `${word} `;
          y += 52;
        } else {
          line = next;
        }
      });
      if (line) ctx.fillText(line, 80, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const image = new Image();
    image.decoding = 'async';
    image.src = item.image;
    image.onload = () => {
      const drawContext = canvas.getContext('2d');
      if (!drawContext) return;
      drawContext.fillStyle = 'rgba(203,224,245,0.85)';
      drawContext.fillRect(80, 94, 864, 564);
      drawContext.drawImage(image, 80, 94, 864, 564);
      texture.needsUpdate = true;
    };
    image.onerror = () => {
      console.warn(`[cylinder] Failed to load panel media: ${item.image}`);
    };

    return texture;
  };

  CYLINDER_ITEMS.forEach((item, index) => {
    const texture = createCardTexture(item);
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.26,
      metalness: 0.04,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
      transparent: true,
      opacity: CYLINDER_CONFIG.frontOpacity,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.userData.index = index;
    group.add(mesh);

    panels.push({ mesh, material, texture, baseAngle: index * angleStep, item });
  });

  const layoutPanels = () => {
    const rect = stage.getBoundingClientRect();
    const { radius, panelWidth, panelHeight } = getDimensions();

    renderer.setSize(Math.max(rect.width, 280), Math.max(rect.height, 320), false);
    camera.aspect = Math.max(rect.width, 280) / Math.max(rect.height, 320);
    camera.updateProjectionMatrix();

    panels.forEach((panel) => {
      panel.mesh.geometry.dispose();
      panel.mesh.geometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
      const x = Math.sin(panel.baseAngle) * radius;
      const z = Math.cos(panel.baseAngle) * radius;
      panel.mesh.position.set(x, 0, z);
      panel.mesh.lookAt(0, 0, 0);
    });
  };

  let activePanel = 0;
  const tmpVector = new THREE.Vector3();

  const updateEmphasis = () => {
    let strongest = -1;
    let strongestIndex = 0;

    panels.forEach((panel, idx) => {
      panel.mesh.getWorldPosition(tmpVector);
      const frontness = THREE.MathUtils.clamp((tmpVector.z + 540) / 1040, 0, 1);

      const opacity = THREE.MathUtils.lerp(CYLINDER_CONFIG.backOpacity, CYLINDER_CONFIG.frontOpacity, frontness);
      const scale = THREE.MathUtils.lerp(CYLINDER_CONFIG.sideScale, CYLINDER_CONFIG.frontLiftScale, frontness);

      panel.material.opacity = opacity;
      panel.mesh.scale.setScalar(scale);

      if (frontness > strongest) {
        strongest = frontness;
        strongestIndex = idx;
      }
    });

    if (strongestIndex !== activePanel) {
      activePanel = strongestIndex;
      fillDetail(detail, panels[strongestIndex].item);
      gsap.fromTo(detail, { y: 12, opacity: 0.75 }, { y: 0, opacity: 1, duration: 0.28, overwrite: true });
    }
  };

  const state = { progress: 0 };

  const render = () => {
    group.rotation.y = -state.progress * Math.PI * 2;
    updateEmphasis();
    renderer.render(scene, camera);
  };

  const spinTween = gsap.to(state, {
    progress: (CYLINDER_ITEMS.length - 1) / CYLINDER_ITEMS.length,
    ease: 'none',
    scrollTrigger: {
      trigger: cylinderScroll,
      pin: true,
      scrub: 1,
      start: 'top top',
      end: `+=${window.innerHeight * (CYLINDER_CONFIG.scrollDistanceVh / 100)}`,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: render,
      onRefresh: () => {
        layoutPanels();
        render();
      },
    },
  });

  const onResize = () => {
    layoutPanels();
    render();
  };

  window.addEventListener('resize', onResize);

  layoutPanels();
  render();
  section.classList.add('is-enhanced');

  window.addEventListener(
    'beforeunload',
    () => {
      window.removeEventListener('resize', onResize);
      spinTween.kill();
      panels.forEach((panel) => {
        panel.mesh.geometry.dispose();
        panel.material.dispose();
        panel.texture.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    },
    { once: true },
  );
};

const waitForCylinderDependencies = () => {
  const maxWaitMs = 7000;
  const stepMs = 100;
  let elapsed = 0;

  const loop = () => {
    const ready = Boolean(window.THREE && window.gsap && window.ScrollTrigger);
    if (ready || elapsed >= maxWaitMs) {
      if (!ready) {
        console.warn('[cylinder] Timed out waiting for Three.js/GSAP dependencies. Static fallback remains visible.');
      }
      initCylinder();
      return;
    }
    elapsed += stepMs;
    window.setTimeout(loop, stepMs);
  };

  loop();
};

document.addEventListener('DOMContentLoaded', waitForCylinderDependencies);
