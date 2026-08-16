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
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 14;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Shape sits offset to the right so it reads alongside the left-aligned text
  const rig = new THREE.Group();
  rig.position.x = 3.4;
  scene.add(rig);

  // ---- Outer crystal: wireframe icosahedron ----
  const outerGeo = new THREE.IcosahedronGeometry(3.1, 0);
  const outerEdges = new THREE.EdgesGeometry(outerGeo);
  const outerLines = new THREE.LineSegments(
    outerEdges,
    new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.85 })
  );
  const outerFill = new THREE.Mesh(
    outerGeo,
    new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.035,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  const outer = new THREE.Group();
  outer.add(outerFill, outerLines);
  rig.add(outer);

  // ---- Inner crystal: smaller, counter-rotating for depth ----
  const innerGeo = new THREE.IcosahedronGeometry(1.55, 0);
  const innerEdges = new THREE.EdgesGeometry(innerGeo);
  const innerLines = new THREE.LineSegments(
    innerEdges,
    new THREE.LineBasicMaterial({ color: 0x9fc1ff, transparent: true, opacity: 0.55 })
  );
  rig.add(innerLines);

  // ---- Sparse distant starfield for depth ----
  const STAR_COUNT = 180;
  const starPositions = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    starPositions.push(
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 30 - 8
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0x8fb4ff,
    size: 0.04,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true
  }));
  scene.add(stars);

  // ---- Sizing ----
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    // On narrow screens, bring the shape back toward center and shrink the offset
    const narrow = w < 820;
    rig.position.x = narrow ? 0 : 3.4;
    const scale = narrow ? Math.max(0.55, w / 820) : 1;
    rig.scale.setScalar(scale);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- Mouse parallax (camera-driven, independent of auto-rotation) ----
  let targetCamX = 0, targetCamY = 0;
  window.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    targetCamX = nx * 0.9;
    targetCamY = ny * 0.5;
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
      outer.rotation.y += 0.0022;
      outer.rotation.x += 0.0009;
      innerLines.rotation.y -= 0.0035;
      innerLines.rotation.x -= 0.0014;
      stars.rotation.y += 0.0002;
    }

    camera.position.x += (targetCamX - camera.position.x) * 0.03;
    camera.position.y += (-targetCamY - camera.position.y) * 0.03;
    camera.lookAt(rig.position.x * 0.3, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
})();
