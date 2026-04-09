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
  radiusDesktop: 340,
  radiusTablet: 275,
  radiusMobile: 210,
  panelWidthDesktop: 275,
  panelWidthTablet: 230,
  panelWidthMobile: 185,
  panelHeightDesktop: 350,
  panelHeightTablet: 310,
  panelHeightMobile: 265,
  scrollDistanceVh: 340,
  cameraZ: 890,
  cameraY: 12,
  frontOpacity: 1,
  backOpacity: 0.15,
  frontScale: 1.05,
  sideScale: 0.82,
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

const initCylinder = () => {
  const section = select('.cylinder-section');
  const enhanced = select('[data-cylinder-enhanced]');
  const stage = select('[data-cylinder-stage]');
  const detail = select('[data-cylinder-detail]');

  if (!section || !enhanced || !stage || !detail) return;

  setDetail(detail, CYLINDER_ITEMS[0]);
  section.classList.remove('is-enhanced');

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    console.warn('[cylinder] Reduced motion is enabled. Using visible static fallback.');
    return;
  }

  if (!window.THREE || !window.gsap || !window.ScrollTrigger) {
    console.warn('[cylinder] Missing Three.js/GSAP dependencies. Using visible static fallback.');
    return;
  }

  const { THREE, gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    console.warn('[cylinder] WebGL init failed. Using visible static fallback.', error);
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearAlpha(0);
  stage.appendChild(renderer.domElement);

  section.classList.add('is-enhanced');
  const stageRect = stage.getBoundingClientRect();
  if (stageRect.width < 60 || stageRect.height < 60) {
    console.warn('[cylinder] Stage has zero/invalid size. Reverting to static fallback.');
    section.classList.remove('is-enhanced');
    renderer.dispose();
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 3000);
  camera.position.set(0, CYLINDER_CONFIG.cameraY, CYLINDER_CONFIG.cameraZ);

  scene.add(new THREE.AmbientLight(0xffffff, 0.86));
  const keyLight = new THREE.DirectionalLight(0xdbe9ff, 1.16);
  keyLight.position.set(130, 170, 280);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x9cb2ff, 0.72);
  rimLight.position.set(-220, 45, -220);
  scene.add(rimLight);

  const group = new THREE.Group();
  scene.add(group);

  const getSizeConfig = () => {
    const w = window.innerWidth;
    if (w < 700) {
      return {
        radius: CYLINDER_CONFIG.radiusMobile,
        panelWidth: CYLINDER_CONFIG.panelWidthMobile,
        panelHeight: CYLINDER_CONFIG.panelHeightMobile,
      };
    }
    if (w < 1040) {
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

  const createTexture = (item) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bg.addColorStop(0, 'rgba(255,255,255,0.98)');
      bg.addColorStop(1, 'rgba(227,240,255,0.92)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = item.theme;
      ctx.fillRect(0, 0, canvas.width, 52);

      ctx.fillStyle = 'rgba(199,223,248,0.85)';
      ctx.fillRect(80, 96, 864, 560);

      ctx.fillStyle = '#2a5f95';
      ctx.font = '600 44px Plus Jakarta Sans, Arial';
      ctx.fillText(item.subtitle, 80, 760);

      ctx.fillStyle = '#102640';
      ctx.font = '700 74px Fraunces, Georgia';
      ctx.fillText(item.title, 80, 858);

      ctx.fillStyle = '#2f445a';
      ctx.font = '500 40px Plus Jakarta Sans, Arial';
      const words = item.description.split(' ');
      let line = '';
      let y = 940;
      words.forEach((word) => {
        const candidate = `${line}${word} `;
        if (ctx.measureText(candidate).width > 840) {
          ctx.fillText(line, 80, y);
          line = `${word} `;
          y += 50;
        } else {
          line = candidate;
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
      const drawCtx = canvas.getContext('2d');
      if (!drawCtx) return;
      drawCtx.fillStyle = 'rgba(199,223,248,0.85)';
      drawCtx.fillRect(80, 96, 864, 560);
      drawCtx.drawImage(image, 80, 96, 864, 560);
      texture.needsUpdate = true;
    };
    image.onerror = () => {
      console.warn(`[cylinder] Media failed to load: ${item.image}`);
    };

    return texture;
  };

  const angleStep = (Math.PI * 2) / CYLINDER_ITEMS.length;
  const panels = CYLINDER_ITEMS.map((item, index) => {
    const texture = createTexture(item);
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.25,
      metalness: 0.05,
      clearcoat: 0.58,
      clearcoatRoughness: 0.31,
      transparent: true,
      opacity: CYLINDER_CONFIG.frontOpacity,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    group.add(mesh);
    return { item, texture, material, mesh, baseAngle: index * angleStep };
  });

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(rect.width, 300);
    const height = Math.max(rect.height, 320);
    const { radius, panelWidth, panelHeight } = getSizeConfig();

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
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

  const vector = new THREE.Vector3();
  let active = 0;
  const state = { progress: 0 };

  const render = () => {
    group.rotation.y = -state.progress * Math.PI * 2;

    let strongest = -1;
    let strongestIndex = 0;

    panels.forEach((panel, index) => {
      panel.mesh.getWorldPosition(vector);
      const frontness = THREE.MathUtils.clamp((vector.z + 540) / 1020, 0, 1);
      panel.material.opacity = THREE.MathUtils.lerp(CYLINDER_CONFIG.backOpacity, CYLINDER_CONFIG.frontOpacity, frontness);
      panel.mesh.scale.setScalar(THREE.MathUtils.lerp(CYLINDER_CONFIG.sideScale, CYLINDER_CONFIG.frontScale, frontness));

      if (frontness > strongest) {
        strongest = frontness;
        strongestIndex = index;
      }
    });

    if (strongestIndex !== active) {
      active = strongestIndex;
      setDetail(detail, panels[strongestIndex].item);
      gsap.fromTo(detail, { y: 12, opacity: 0.76 }, { y: 0, opacity: 1, duration: 0.24, overwrite: true });
    }

    renderer.render(scene, camera);
  };

  const spin = gsap.to(state, {
    progress: (CYLINDER_ITEMS.length - 1) / CYLINDER_ITEMS.length,
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
        resize();
        render();
      },
    },
  });

  const onResize = () => {
    resize();
    render();
  };

  window.addEventListener('resize', onResize);

  resize();
  render();

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('resize', onResize);
    spin.kill();
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
        console.warn('[cylinder] Library timeout. Keeping static fallback visible.');
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
