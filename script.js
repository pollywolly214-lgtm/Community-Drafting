const CONFIG = {
  radius: 240,
  height: 620,
  radialSegments: 128,
  cameraZ: 860,
  cameraY: 40,
  wheelInfluence: 0.0016,
  momentumDecay: 0.92,
  smoothing: 0.09,
  scrollTurns: 3.2,
};

const stage = document.querySelector('[data-stage]');
const fallbackCylinder = document.querySelector('[data-fallback-cylinder]');

const showFallback = (message) => {
  if (!fallbackCylinder) return;
  fallbackCylinder.textContent = message;
  fallbackCylinder.classList.remove('is-hidden');
};

if (!stage || !window.THREE) {
  showFallback('3D engine unavailable');
} else {
  const { THREE } = window;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x02060d, 900, 1600);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 4000);
  camera.position.set(0, CONFIG.cameraY, CONFIG.cameraZ);

  scene.add(new THREE.AmbientLight(0xffffff, 0.52));

  const key = new THREE.DirectionalLight(0x9dd2ff, 1.45);
  key.position.set(240, 280, 290);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x6f87ff, 0.55);
  fill.position.set(-260, 30, 120);
  scene.add(fill);

  const rim = new THREE.PointLight(0x51b8ff, 1.35, 2600);
  rim.position.set(0, -80, -260);
  scene.add(rim);

  const buildCylinderTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bg.addColorStop(0, '#d8ebff');
      bg.addColorStop(0.5, '#f2f8ff');
      bg.addColorStop(1, '#c9def5');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const columns = 14;
      const colWidth = canvas.width / columns;
      for (let i = 0; i < columns; i += 1) {
        const x = i * colWidth;
        const tint = i % 2 === 0 ? 'rgba(78,140,208,0.22)' : 'rgba(112,170,232,0.14)';
        ctx.fillStyle = tint;
        ctx.fillRect(x + 8, 0, colWidth - 16, canvas.height);

        ctx.fillStyle = '#1b426a';
        ctx.font = '700 44px Arial';
        ctx.fillText(`Panel ${i + 1}`, x + 26, 92);

        ctx.strokeStyle = 'rgba(17,53,86,0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 24, 130, colWidth - 48, canvas.height - 180);

        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x + 34, 148, colWidth - 68, canvas.height - 330);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 8;
    return texture;
  };

  const texture = buildCylinderTexture();

  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(CONFIG.radius, CONFIG.radius, CONFIG.height, CONFIG.radialSegments, 1, false),
    new THREE.MeshPhysicalMaterial({
      map: texture,
      roughness: 0.32,
      metalness: 0.12,
      clearcoat: 0.72,
      clearcoatRoughness: 0.24,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xa8d4ff),
    }),
  );
  scene.add(cylinder);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(cylinder.geometry, 30),
    new THREE.LineBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.26 }),
  );
  scene.add(edge);

  const topGlow = new THREE.Mesh(
    new THREE.CircleGeometry(CONFIG.radius * 0.98, 80),
    new THREE.MeshBasicMaterial({ color: 0xb9e3ff, transparent: true, opacity: 0.22 }),
  );
  topGlow.rotation.x = -Math.PI / 2;
  topGlow.position.y = CONFIG.height / 2 + 0.8;
  scene.add(topGlow);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(CONFIG.radius * 1.55, 80),
    new THREE.MeshBasicMaterial({ color: 0x0e2742, transparent: true, opacity: 0.4 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -(CONFIG.height / 2 + 80);
  scene.add(floor);

  let targetRotation = 0;
  let currentRotation = 0;
  let wheelMomentum = 0;

  const onScroll = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    targetRotation = (window.scrollY / max) * Math.PI * CONFIG.scrollTurns;
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
  if (fallbackCylinder) fallbackCylinder.classList.add('is-hidden');

  const animate = () => {
    wheelMomentum *= CONFIG.momentumDecay;
    targetRotation += wheelMomentum;
    currentRotation += (targetRotation - currentRotation) * CONFIG.smoothing;

    cylinder.rotation.y = -currentRotation;
    edge.rotation.y = -currentRotation;
    topGlow.rotation.z = -currentRotation;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  animate();

  window.addEventListener('beforeunload', () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', onResize);
    cylinder.geometry.dispose();
    cylinder.material.map.dispose();
    cylinder.material.dispose();
    edge.geometry.dispose();
    edge.material.dispose();
    topGlow.geometry.dispose();
    topGlow.material.dispose();
    floor.geometry.dispose();
    floor.material.dispose();
    renderer.dispose();
  }, { once: true });
}
