const PANEL_CONTENT = [
  { title: 'Modeling', color: '#7fd3ff' },
  { title: 'Layouts', color: '#8ea0ff' },
  { title: 'Printing', color: '#6dd8ff' },
  { title: 'Site Visit', color: '#9db2ff' },
  { title: 'Permits', color: '#79beff' },
  { title: 'Revisions', color: '#75d4ff' },
  { title: 'Support', color: '#95a3ff' },
  { title: 'Delivery', color: '#68b2ff' },
];

const CONFIG = {
  radius: 300,
  panelWidth: 170,
  panelHeight: 230,
  rings: 3,
  ringSpacing: 200,
  cameraZ: 980,
  cameraY: 20,
  wheelInfluence: 0.0018,
  momentumDecay: 0.92,
  smoothing: 0.08,
  cylinderHeight: 640,
  cylinderRadiusRatio: 0.9,
};

const stage = document.querySelector('[data-stage]');
if (!stage || !window.THREE) {
  console.warn('Three.js stage not available.');
} else {
  const { THREE } = window;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 4000);
  camera.position.set(0, CONFIG.cameraY, CONFIG.cameraZ);

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xbad6ff, 1.35);
  key.position.set(180, 220, 320);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x89a8ff, 0.7);
  fill.position.set(-260, 40, 120);
  scene.add(fill);

  const rim = new THREE.PointLight(0x7bc9ff, 0.9, 2400);
  rim.position.set(0, -120, -300);
  scene.add(rim);

  const cylinderGroup = new THREE.Group();
  scene.add(cylinderGroup);

  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x245b8f,
    roughness: 0.35,
    metalness: 0.08,
    transmission: 0.08,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
  });
  const coreMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      CONFIG.radius * CONFIG.cylinderRadiusRatio,
      CONFIG.radius * CONFIG.cylinderRadiusRatio,
      CONFIG.cylinderHeight,
      64,
      1,
      true,
    ),
    coreMaterial,
  );
  cylinderGroup.add(coreMesh);

  const edgeGeometry = new THREE.EdgesGeometry(coreMesh.geometry);
  const edgeLines = new THREE.LineSegments(
    edgeGeometry,
    new THREE.LineBasicMaterial({ color: 0x7bc9ff, transparent: true, opacity: 0.4 }),
  );
  cylinderGroup.add(edgeLines);

  const makeTexture = (item) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, 'rgba(245,250,255,0.98)');
      grad.addColorStop(1, 'rgba(211,231,255,0.94)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = item.color;
      ctx.fillRect(0, 0, canvas.width, 24);

      ctx.fillStyle = '#15304d';
      ctx.font = '700 54px Arial';
      ctx.fillText(item.title, 48, 110);

      ctx.strokeStyle = 'rgba(59,94,132,0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };

  const panels = [];
  const angleStep = (Math.PI * 2) / PANEL_CONTENT.length;

  for (let ring = 0; ring < CONFIG.rings; ring += 1) {
    const yOffset = (ring - (CONFIG.rings - 1) / 2) * CONFIG.ringSpacing;

    PANEL_CONTENT.forEach((item, index) => {
      const texture = makeTexture(item);
      const material = new THREE.MeshPhysicalMaterial({
        map: texture,
        roughness: 0.22,
        metalness: 0.06,
        clearcoat: 0.68,
        clearcoatRoughness: 0.3,
        transparent: true,
        opacity: 1,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.panelWidth, CONFIG.panelHeight), material);
      const angle = index * angleStep + (ring % 2 ? angleStep / 2 : 0);
      const x = Math.sin(angle) * CONFIG.radius;
      const z = Math.cos(angle) * CONFIG.radius;

      mesh.position.set(x, yOffset, z);
      mesh.lookAt(0, yOffset * 0.05, 0);

      cylinderGroup.add(mesh);
      panels.push({ mesh, material, texture });
    });
  }

  let targetRotation = 0;
  let currentRotation = 0;
  let wheelMomentum = 0;

  const onScroll = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = window.scrollY / max;
    targetRotation = progress * Math.PI * 4;
  };

  const onWheel = (event) => {
    wheelMomentum += event.deltaY * CONFIG.wheelInfluence;
  };

  const onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('resize', onResize);

  onScroll();

  const tmp = new THREE.Vector3();

  const animate = () => {
    wheelMomentum *= CONFIG.momentumDecay;
    targetRotation += wheelMomentum;

    currentRotation += (targetRotation - currentRotation) * CONFIG.smoothing;
    cylinderGroup.rotation.y = -currentRotation;
    cylinderGroup.rotation.x = -0.05;

    panels.forEach((panel) => {
      panel.mesh.getWorldPosition(tmp);
      const frontness = THREE.MathUtils.clamp((tmp.z + 560) / 1160, 0, 1);
      panel.material.opacity = THREE.MathUtils.lerp(0.12, 1, frontness);
      const scale = THREE.MathUtils.lerp(0.72, 1.08, frontness);
      panel.mesh.scale.setScalar(scale);
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', onResize);
    panels.forEach((panel) => {
      panel.mesh.geometry.dispose();
      panel.material.dispose();
      panel.texture.dispose();
    });
    coreMesh.geometry.dispose();
    coreMaterial.dispose();
    edgeGeometry.dispose();
    edgeLines.material.dispose();
    renderer.dispose();
  }, { once: true });
}
