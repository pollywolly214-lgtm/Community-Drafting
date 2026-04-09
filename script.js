const CYLINDER_ITEMS = [
  {
    title: '3D Modeling',
    subtitle: 'Fabrication Ready',
    description: 'Production-grade models and shop-ready outputs for real fabrication workflows.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Explore service',
    ctaHref: 'service-3d-modeling.html',
    theme: '#63b8ff',
  },
  {
    title: '2D Modeling',
    subtitle: 'Field Documentation',
    description: 'Clear 2D layouts and permit-ready documentation for install teams and stakeholders.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'View details',
    ctaHref: 'service-2d-modeling.html',
    theme: '#8a8dff',
  },
  {
    title: '3D Printing',
    subtitle: 'Rapid Prototype',
    description: 'Functional prototypes and presentation models for validation and fit checks.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'See prints',
    ctaHref: 'service-3d-printing.html',
    theme: '#5fd5ff',
  },
  {
    title: 'On-site Visit',
    subtitle: 'Measured Scope',
    description: 'In-person measurement and scope alignment to prevent rework and reduce risk.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Schedule visit',
    ctaHref: 'schedule-visit.html',
    theme: '#95a6ff',
  },
  {
    title: 'Permit Set',
    subtitle: 'Approval Ready',
    description: 'Code-oriented drawing packs prepared for review and permit submissions.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Request set',
    ctaHref: 'call-designer.html',
    theme: '#7ec3ff',
  },
  {
    title: 'Concept Draft',
    subtitle: 'Early Direction',
    description: 'Fast concept drafting to lock scope before committing to fabrication details.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Start concept',
    ctaHref: 'call-designer.html',
    theme: '#73d4ff',
  },
  {
    title: 'Revision Sprint',
    subtitle: 'Rapid Iteration',
    description: 'Focused revision rounds to move from feedback to final outputs quickly.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Plan revision',
    ctaHref: 'call-designer.html',
    theme: '#9c9bff',
  },
  {
    title: 'Designer Support',
    subtitle: 'Direct Access',
    description: 'Work directly with a designer throughout the project for consistent decisions.',
    image: 'assets/placeholder-image.svg',
    ctaLabel: 'Contact now',
    ctaHref: 'call-designer.html',
    theme: '#62b0ff',
  },
];

const CYLINDER_CONFIG = {
  rings: 2,
  ringYOffset: 200,
  radiusDesktop: 370,
  radiusTablet: 300,
  radiusMobile: 235,
  panelWidthDesktop: 252,
  panelWidthTablet: 210,
  panelWidthMobile: 170,
  panelHeightDesktop: 322,
  panelHeightTablet: 282,
  panelHeightMobile: 240,
  scrollDistanceVh: 420,
  cameraZ: 980,
  cameraY: 20,
  frontOpacity: 1,
  backOpacity: 0.1,
  frontScale: 1.08,
  sideScale: 0.74,
};

const select = (selector) => document.querySelector(selector);

const setDetail = (detailCard, item) => {
  if (!detailCard || !item) return;
  const label = detailCard.querySelector('.detail-card__label');
  const title = detailCard.querySelector('.detail-card__title');
  const description = detailCard.querySelector('.detail-card__description');
  const cta = detailCard.querySelector('.detail-card__cta');

  if (label) label.textContent = item.subtitle;
  if (title) title.textContent = item.title;
  if (description) description.textContent = item.description;
  if (cta) {
    cta.textContent = item.ctaLabel;
    cta.setAttribute('href', item.ctaHref);
  }
};

const createTextureFactory = (THREE) => (item) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, 'rgba(250,253,255,0.98)');
    bg.addColorStop(1, 'rgba(219,236,255,0.92)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = item.theme;
    ctx.fillRect(0, 0, canvas.width, 52);

    ctx.fillStyle = 'rgba(188,218,250,0.85)';
    ctx.fillRect(74, 92, 876, 560);

    ctx.fillStyle = '#2d6298';
    ctx.font = '600 42px Plus Jakarta Sans, Arial';
    ctx.fillText(item.subtitle, 74, 750);

    ctx.fillStyle = '#0e2842';
    ctx.font = '700 70px Fraunces, Georgia';
    ctx.fillText(item.title, 74, 846);

    ctx.fillStyle = '#344b63';
    ctx.font = '500 38px Plus Jakarta Sans, Arial';
    const words = item.description.split(' ');
    let line = '';
    let y = 926;
    words.forEach((word) => {
      const candidate = `${line}${word} `;
      if (ctx.measureText(candidate).width > 866) {
        ctx.fillText(line, 74, y);
        line = `${word} `;
        y += 50;
      } else {
        line = candidate;
      }
    });
    if (line) ctx.fillText(line, 74, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const image = new Image();
  image.decoding = 'async';
  image.src = item.image;
  image.onload = () => {
    const drawCtx = canvas.getContext('2d');
    if (!drawCtx) return;
    drawCtx.fillStyle = 'rgba(188,218,250,0.85)';
    drawCtx.fillRect(74, 92, 876, 560);
    drawCtx.drawImage(image, 74, 92, 876, 560);
    texture.needsUpdate = true;
  };
  image.onerror = () => {
    console.warn(`[cylinder] Media failed to load: ${item.image}`);
  };

  return texture;
};

const initCylinder = () => {
  const section = select('.cylinder-section');
  const enhanced = select('[data-cylinder-enhanced]');
  const stage = select('[data-cylinder-stage]');
  const detail = select('[data-cylinder-detail]');

  if (!section || !enhanced || !stage || !detail) return;

  setDetail(detail, CYLINDER_ITEMS[0]);
  section.classList.remove('is-enhanced');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    console.warn('[cylinder] Reduced motion enabled; keeping static fallback.');
    return;
  }

  if (!window.THREE || !window.gsap || !window.ScrollTrigger) {
    console.warn('[cylinder] Missing required libraries; keeping static fallback.');
    return;
  }

  const { THREE, gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('[cylinder] WebGL initialization failed; keeping static fallback.', error);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearAlpha(0);
  stage.appendChild(renderer.domElement);

  section.classList.add('is-enhanced');
  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width < 60 || stageRect.height < 60) {
    console.warn('[cylinder] Stage size invalid after enhancement; reverting to fallback.');
    section.classList.remove('is-enhanced');
    renderer.dispose();
    renderer.domElement.remove();
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 4000);
  camera.position.set(0, CYLINDER_CONFIG.cameraY, CYLINDER_CONFIG.cameraZ);

  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const keyLight = new THREE.DirectionalLight(0xdbe9ff, 1.14);
  keyLight.position.set(160, 200, 300);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xa9beff, 0.68);
  fillLight.position.set(-260, 40, 100);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x88bbff, 0.5);
  rimLight.position.set(0, -160, -260);
  scene.add(rimLight);

  const world = new THREE.Group();
  scene.add(world);

  const createTexture = createTextureFactory(THREE);
  const panels = [];

  const getSizes = () => {
    const width = window.innerWidth;
    if (width < 700) {
      return {
        radius: CYLINDER_CONFIG.radiusMobile,
        panelWidth: CYLINDER_CONFIG.panelWidthMobile,
        panelHeight: CYLINDER_CONFIG.panelHeightMobile,
      };
    }
    if (width < 1040) {
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

  const ringCount = CYLINDER_CONFIG.rings;
  const angleStep = (Math.PI * 2) / CYLINDER_ITEMS.length;
  const totalSpan = ringCount === 1 ? 0 : CYLINDER_CONFIG.ringYOffset;

  for (let ring = 0; ring < ringCount; ring += 1) {
    const yOffset = ringCount === 1 ? 0 : -totalSpan / 2 + (totalSpan / (ringCount - 1)) * ring;
    for (let i = 0; i < CYLINDER_ITEMS.length; i += 1) {
      const item = CYLINDER_ITEMS[(i + ring) % CYLINDER_ITEMS.length];
      const texture = createTexture(item);
      const material = new THREE.MeshPhysicalMaterial({
        map: texture,
        roughness: 0.22,
        metalness: 0.06,
        clearcoat: 0.62,
        clearcoatRoughness: 0.29,
        transparent: true,
        opacity: CYLINDER_CONFIG.frontOpacity,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      world.add(mesh);
      panels.push({
        ring,
        item,
        texture,
        material,
        mesh,
        baseAngle: i * angleStep + (ring % 2 ? angleStep / 2 : 0),
        yOffset,
      });
    }
  }

  const sizeAndPosition = () => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    const height = Math.max(rect.height, 360);
    const { radius, panelWidth, panelHeight } = getSizes();

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    panels.forEach((panel) => {
      panel.mesh.geometry.dispose();
      panel.mesh.geometry = new THREE.PlaneGeometry(panelWidth, panelHeight);
      panel.mesh.position.set(
        Math.sin(panel.baseAngle) * radius,
        panel.yOffset,
        Math.cos(panel.baseAngle) * radius,
      );
      panel.mesh.lookAt(0, panel.yOffset * 0.05, 0);
    });
  };

  const vector = new THREE.Vector3();
  const state = { progress: 0 };
  let activeIndex = 0;

  const render = () => {
    world.rotation.y = -state.progress * Math.PI * 2;
    world.rotation.x = -0.05;

    let strongest = -1;
    let strongestPanel = panels[0];

    panels.forEach((panel) => {
      panel.mesh.getWorldPosition(vector);
      const frontness = THREE.MathUtils.clamp((vector.z + 620) / 1160, 0, 1);
      const verticalInfluence = THREE.MathUtils.clamp(1 - Math.abs(vector.y) / 340, 0.4, 1);
      const score = frontness * verticalInfluence;

      panel.material.opacity = THREE.MathUtils.lerp(CYLINDER_CONFIG.backOpacity, CYLINDER_CONFIG.frontOpacity, score);
      panel.mesh.scale.setScalar(THREE.MathUtils.lerp(CYLINDER_CONFIG.sideScale, CYLINDER_CONFIG.frontScale, score));

      if (score > strongest) {
        strongest = score;
        strongestPanel = panel;
      }
    });

    const nextIndex = CYLINDER_ITEMS.findIndex((item) => item.title === strongestPanel.item.title);
    if (nextIndex !== activeIndex && nextIndex >= 0) {
      activeIndex = nextIndex;
      setDetail(detail, CYLINDER_ITEMS[nextIndex]);
      gsap.fromTo(detail, { y: 14, opacity: 0.74 }, { y: 0, opacity: 1, duration: 0.26, overwrite: true });
    }

    renderer.render(scene, camera);
  };

  const spinTween = gsap.to(state, {
    progress: 1.25,
    ease: 'none',
    scrollTrigger: {
      trigger: enhanced,
      start: 'top top',
      end: `+=${window.innerHeight * (CYLINDER_CONFIG.scrollDistanceVh / 100)}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      onUpdate: render,
      onRefresh: () => {
        sizeAndPosition();
        render();
      },
    },
  });

  const onResize = () => {
    sizeAndPosition();
    render();
  };

  window.addEventListener('resize', onResize);

  sizeAndPosition();
  render();

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('resize', onResize);
    spinTween.kill();
    panels.forEach((panel) => {
      panel.mesh.geometry.dispose();
      panel.material.dispose();
      panel.texture.dispose();
    });
    renderer.dispose();
  }, { once: true });
};

const waitForLibrariesThenInit = () => {
  const timeoutMs = 7000;
  const stepMs = 100;
  let elapsed = 0;

  const poll = () => {
    const ready = Boolean(window.THREE && window.gsap && window.ScrollTrigger);
    if (ready || elapsed >= timeoutMs) {
      if (!ready) {
        console.warn('[cylinder] Library timeout reached. Static fallback remains active.');
      }
      initCylinder();
      return;
    }

    elapsed += stepMs;
    window.setTimeout(poll, stepMs);
  };

  poll();
};

document.addEventListener('DOMContentLoaded', waitForLibrariesThenInit);
