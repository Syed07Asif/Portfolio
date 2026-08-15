(function () {
  const container = document.getElementById('hero3d');
  if (!container || typeof THREE === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const accent = 0x4f8cff;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (e) {
    return; // no WebGL support - CSS gradient background still shows
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = 13;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // ---- Network sphere (nodes) ----
  const NODE_COUNT = 160;
  const RADIUS = 5.2;
  const nodePositions = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    // Fibonacci sphere distribution for even spacing
    const y = 1 - (i / (NODE_COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const jitter = 0.9 + Math.random() * 0.2;
    nodePositions.push(x * RADIUS * jitter, y * RADIUS * jitter, z * RADIUS * jitter);
  }

  const nodeGeometry = new THREE.BufferGeometry();
  nodeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
  const nodeMaterial = new THREE.PointsMaterial({
    color: accent,
    size: 0.11,
    transparent: true,
    opacity: 0.95,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const points = new THREE.Points(nodeGeometry, nodeMaterial);

  // ---- Connections between nearby nodes ----
  const linePositions = [];
  const MAX_DIST = 2.3;
  for (let i = 0; i < NODE_COUNT; i++) {
    const ix = nodePositions[i * 3], iy = nodePositions[i * 3 + 1], iz = nodePositions[i * 3 + 2];
    for (let j = i + 1; j < NODE_COUNT; j++) {
      const jx = nodePositions[j * 3], jy = nodePositions[j * 3 + 1], jz = nodePositions[j * 3 + 2];
      const d = Math.hypot(ix - jx, iy - jy, iz - jz);
      if (d < MAX_DIST) {
        linePositions.push(ix, iy, iz, jx, jy, jz);
      }
    }
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);

  const network = new THREE.Group();
  network.add(points, lines);
  scene.add(network);

  // ---- Sparse distant starfield for depth ----
  const STAR_COUNT = 220;
  const starPositions = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    starPositions.push(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40 - 10
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: 0x8fb4ff,
    size: 0.045,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // ---- Sizing ----
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- Mouse parallax (drives the camera, independent of the auto-rotation) ----
  let targetCamX = 0, targetCamY = 0;
  window.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    targetCamX = nx * 1.4;
    targetCamY = ny * 0.8;
  });

  // ---- Render loop ----
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(animate);
  });

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);

    if (!prefersReducedMotion) {
      network.rotation.y += 0.0012;
      network.rotation.x += 0.0003;
      stars.rotation.y += 0.0002;
    }

    camera.position.x += (targetCamX - camera.position.x) * 0.03;
    camera.position.y += (-targetCamY - camera.position.y) * 0.03;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  }
  animate();
})();
