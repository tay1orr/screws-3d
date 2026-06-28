import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Game } from './game.js';
import { BinView } from './2026-06-28-bin-view.js';
import { createHeartParty } from './2026-06-28-heart-party.js';
import { createProgressStore } from './2026-06-28-progress-store.js';
import { playHeartParty, resumeAudio } from './audio.js';
import { LEVEL_SUMMARY } from './levels.js';

// ---------- Renderer ----------
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
// No tone mapping → keeps cartoon colors bright and poppy.
renderer.toneMapping = THREE.NoToneMapping;
renderer.setSize(window.innerWidth, window.innerHeight);

// ---------- Scene ----------
const scene = new THREE.Scene();

// Cartoon-bright sky gradient via vertex-shader sphere
const skyGeo = new THREE.SphereGeometry(80, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    topColor: { value: new THREE.Color(0x6cc4ff) },   // sky blue
    midColor: { value: new THREE.Color(0xb8e3ff) },   // pale blue
    botColor: { value: new THREE.Color(0xfff4d8) },   // warm cream
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize((modelMatrix * vec4(position, 0.0)).xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 midColor;
    uniform vec3 botColor;
    varying vec3 vDir;
    void main() {
      float h = vDir.y * 0.5 + 0.5;
      vec3 col = mix(botColor, midColor, smoothstep(0.0, 0.55, h));
      col = mix(col, topColor, smoothstep(0.55, 1.0, h));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(5.5, 4.5, 8.5);
scene.add(camera);

// ---------- Lights ----------
scene.add(new THREE.HemisphereLight(0xfff7e0, 0x88a4c8, 0.85));

const sun = new THREE.DirectionalLight(0xfff2c8, 0.95);
sun.position.set(6, 12, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10;
sc.near = 0.5; sc.far = 30;
sun.shadow.bias = -0.0008;
sun.shadow.radius = 3;
scene.add(sun);

const rim = new THREE.DirectionalLight(0xa0c8ff, 0.35);
rim.position.set(-6, 3, -6);
scene.add(rim);

// ---------- Floating play island + soft cloud layer ----------
const groundGroup = new THREE.Group();
const grassMat = new THREE.MeshToonMaterial({ color: 0x7cd790 });
const grass = new THREE.Mesh(new THREE.CircleGeometry(2.80, 64), grassMat);
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.301;
grass.receiveShadow = true;
groundGroup.add(grass);

// Rounded cream underside makes the stage read as a floating toy island.
const islandBase = new THREE.Mesh(
  new THREE.CylinderGeometry(2.70, 2.35, 0.48, 64),
  new THREE.MeshToonMaterial({ color: 0xe9d6aa })
);
islandBase.position.y = -0.58;
islandBase.receiveShadow = true;
groundGroup.add(islandBase);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(2.70, 2.80, 64),
  new THREE.MeshBasicMaterial({ color: 0x4a8a55, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = -0.300;
groundGroup.add(ring);

// Soft shadow plane beyond grass
const shadowPlane = new THREE.Mesh(
  new THREE.CircleGeometry(4.1, 64),
  new THREE.ShadowMaterial({ opacity: 0.22 })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -0.302;
shadowPlane.receiveShadow = true;
groundGroup.add(shadowPlane);
scene.add(groundGroup);

const cloudMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false,
});
const cloudGeo = new THREE.SphereGeometry(1, 20, 12);
for (const [x, y, z, scale] of [
  [-13, 3.8, -14, 0.90], [13, 3.0, -16, 1.05], [-12, 0.8, -10, 0.78], [14, 0.3, -12, 0.88],
]) {
  const cloud = new THREE.Group();
  for (const [ox, oy, s] of [[-0.9, 0, .72], [0, .18, 1], [.95, -.02, .66]]) {
    const puff = new THREE.Mesh(cloudGeo, cloudMaterial);
    puff.position.set(ox, oy, 0);
    puff.scale.set(1.25 * s, .7 * s, .55 * s);
    cloud.add(puff);
  }
  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  scene.add(cloud);
}

// ---------- Controls ----------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.minPolarAngle = 0.18;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.minDistance = 6;
controls.maxDistance = 16;
controls.enablePan = false;
controls.rotateSpeed = 0.85;
controls.target.set(0, 1.0, 0);
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

// ---------- BinView (DOM/SVG collection UI) ----------
const binView = new BinView(document.getElementById('bin-view'));

// viewProj converts a DOM bin's pixel position into a world-space
// THREE.Vector3 so the 3D screw can fly straight to the DOM target.
// Travel a fixed distance along the camera ray so the screw stays at a
// readable size regardless of where the bin sits on screen.
const TARGET_FLIGHT_DISTANCE = 5.5;
const _v2 = new THREE.Vector2();
const _ray = new THREE.Raycaster();

function screenToWorldAt(screenX, screenY, distance) {
  _v2.set(
    (screenX / window.innerWidth)  * 2 - 1,
    -(screenY / window.innerHeight) * 2 + 1,
  );
  _ray.setFromCamera(_v2, camera);
  return _ray.ray.origin.clone().addScaledVector(_ray.ray.direction, distance);
}

const viewProj = {
  getTargetWorldPos(target) {
    const pos = binView.getTargetScreenPos(target);
    if (!pos) return new THREE.Vector3(0, 5, 0);
    return screenToWorldAt(pos.x, pos.y, TARGET_FLIGHT_DISTANCE);
  },
};

// ---------- Game ----------
// IMPORTANT: do NOT call game.loadLevel() here. Loading dispatches
// onCountChange / onStateChange callbacks that haven't been wired yet,
// which is why the HUD used to show "0 / 0" until the first tap.
// The initial load happens at the bottom of this file, after HUD setup.
const game = new Game(scene, camera, binView, viewProj);
const progress = createProgressStore(LEVEL_SUMMARY.length);

// ---------- Click vs Drag ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downPos = null;
let downTime = 0;

canvas.addEventListener('pointerdown', (e) => {
  downPos = { x: e.clientX, y: e.clientY };
  downTime = performance.now();
  resumeAudio();
});

canvas.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const dx = e.clientX - downPos.x;
  const dy = e.clientY - downPos.y;
  const dist = Math.hypot(dx, dy);
  const dt = performance.now() - downTime;
  downPos = null;
  if (dist < 8 && dt < 300) handleTap(e);
});
canvas.addEventListener('pointercancel', () => { downPos = null; });

function handleTap(e) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  // Stage 4 occlusion: raycast against ALL interactive geometry — both
  // attached planks AND attached screws — then only fire if the closest
  // hit is a screw head. A plank in front means the screw is occluded
  // and the tap should do nothing.
  const meshes = [];
  for (const p of game.planks) {
    if (p.state === 'attached' || p.state === 'falling') {
      meshes.push(p.mesh);
    }
  }
  for (const s of game.attachedScrews()) {
    meshes.push(s.mesh);
  }
  if (meshes.length === 0) return;

  const hits = raycaster.intersectObjects(meshes, true);
  if (hits.length === 0) return;

  // Walk up from the closest hit to find what owns it.
  let owner = hits[0].object;
  while (owner && !owner.userData.screw && !owner.userData.plank) {
    owner = owner.parent;
  }
  if (owner?.userData?.screw) {
    game.trySelectScrew(owner.userData.screw);
  }
  // else hit a plank first → the screw behind it is occluded, do nothing.
}

// Phase B: the tray is now in the DOM (BinView), sized in CSS, so the
// old updateTrayForViewport() logic is gone. We still need to reposition
// any existing head tokens whenever the bin DOM moves (resize / layout
// shift), which is handled inside the resize listener below.

// ---------- Camera auto-fit ----------
// Fit all eight bounds corners into the actual free screen rectangle below
// the collector, rather than estimating the collector height as a fraction.
const VIEW_DIR = new THREE.Vector3(0.55, 0.50, 0.95).normalize();
const _fitCorner = new THREE.Vector3();

function levelBoundsCorners(box) {
  const result = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) result.push(new THREE.Vector3(x, y, z));
    }
  }
  return result;
}

function fitCameraToLevel() {
  if (!game.planks.length) return;

  const box = new THREE.Box3();
  let any = false;
  for (const plank of game.planks) {
    if (plank.state === 'attached') {
      box.expandByObject(plank.mesh);
      any = true;
    }
  }
  if (!any) return;

  box.expandByScalar(0.28);
  const center = box.getCenter(new THREE.Vector3());
  const corners = levelBoundsCorners(box);
  const collectorRect = binView.root.getBoundingClientRect();
  const safe = {
    left: 22,
    right: window.innerWidth - 22,
    top: Math.max(150, collectorRect.bottom + 20),
    bottom: window.innerHeight - Math.max(24, parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 24),
  };
  if (safe.bottom <= safe.top + 120) safe.top = Math.min(140, window.innerHeight * .25);
  const vFov = camera.fov * Math.PI / 180;
  const desiredCenterY = safe.top + (safe.bottom - safe.top) * 0.38;

  function placeAtDistance(distance) {
    camera.position.copy(center).addScaledVector(VIEW_DIR, distance);
    camera.lookAt(center);
    camera.updateMatrixWorld(true);
    const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    const worldPerPixel = 2 * distance * Math.tan(vFov / 2) / window.innerHeight;
    const shift = cameraUp.multiplyScalar((desiredCenterY - window.innerHeight / 2) * worldPerPixel);
    camera.position.add(shift);
    controls.target.copy(center).add(shift);
    camera.updateMatrixWorld(true);
  }

  function fits(distance) {
    placeAtDistance(distance);
    for (const corner of corners) {
      _fitCorner.copy(corner).project(camera);
      const x = (_fitCorner.x * .5 + .5) * window.innerWidth;
      const y = (-_fitCorner.y * .5 + .5) * window.innerHeight;
      if (x < safe.left || x > safe.right || y < safe.top || y > safe.bottom) return false;
    }
    return true;
  }

  let low = 2;
  let high = 60;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (fits(mid)) high = mid;
    else low = mid;
  }
  // The mathematical box includes invisible perspective extremes. A tighter
  // presentation matches the reference and keeps the puzzle touch targets big.
  const dist = high * 0.72;
  placeAtDistance(dist);
  controls.minDistance = dist * 0.92;
  controls.maxDistance = dist * 1.55;
  controls.update();
}

// Wrap loadLevel so every level entry refits the camera.
function loadLevelWithFit(idx) {
  game.loadLevel(idx);
  updateLevelLabels();
  const level = game.currentLevel();
  hint.textContent = level?.tutorial ?? '화면을 드래그해 돌리고, 꺼낼 수 있는 나사를 누르세요';
  hint.style.animation = 'none';
  void hint.offsetWidth;
  hint.style.animation = '';
  fitCameraToLevel();
  requestAnimationFrame(fitCameraToLevel);
}

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  requestAnimationFrame(fitCameraToLevel);
  // After the bin DOM has reflowed, snap every existing head token to its
  // new on-screen target position.
  binView.reflowTokens((screwId) => {
    for (const s of game.screws) if (s.id === screwId) return s.target;
    return null;
  });
});

// ---------- HUD ----------
// HUD: small menu button + counter; everything else lives in the pause panel
const screwCountText = document.getElementById('screw-count-text');
const menuBtn = document.getElementById('menu');
const hint = document.getElementById('hint');
const pausePanel = document.getElementById('pause-panel');
const pauseLevelLabel = document.getElementById('pause-level-label');
const pauseResumeBtn = document.getElementById('pause-resume');
const pauseRestartBtn = document.getElementById('pause-restart');
const pauseNextBtn = document.getElementById('pause-next');
const pauseLevelsBtn = document.getElementById('pause-levels');
const creatorTrigger = document.getElementById('creator-trigger');
const creatorPanel = document.getElementById('creator-panel');
const creatorForm = document.getElementById('creator-form');
const creatorClose = document.getElementById('creator-close');
const creatorDate = document.getElementById('creator-date');
const creatorMessage = document.getElementById('creator-message');
const heartParty = createHeartParty(document.getElementById('heart-party'));
const levelPanel = document.getElementById('level-panel');
const levelPanelClose = document.getElementById('level-panel-close');
const levelGrid = document.getElementById('level-grid');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const overlayEmoji = document.getElementById('overlay-emoji');
const overlayBtn = document.getElementById('overlay-btn');
const splash = document.getElementById('splash');
const startBtn = document.getElementById('start-btn');
const splashLevelsBtn = document.getElementById('splash-levels');

function levelLabel(index = game.levelIdx) {
  const meta = LEVEL_SUMMARY[index];
  return meta ? `Level ${index + 1} · ${meta.name}` : `Level ${index + 1}`;
}

function updateLevelLabels() {
  pauseLevelLabel.textContent = levelLabel();
}

function openPause() {
  if (game.state !== 'playing') return;
  updateLevelLabels();
  pauseNextBtn.disabled = !progress.isUnlocked(game.levelIdx + 1);
  game.setPaused(true);
  controls.enabled = false;
  document.body.classList.add('game-paused');
  pausePanel.classList.remove('hidden');
}
function closePause() {
  pausePanel.classList.add('hidden');
  game.setPaused(false);
  controls.enabled = true;
  document.body.classList.remove('game-paused');
  clock.getDelta();
}
menuBtn.addEventListener('click', openPause);
pauseResumeBtn.addEventListener('click', closePause);
pauseRestartBtn.addEventListener('click', () => {
  loadLevelWithFit(game.levelIdx);
  closePause();
  overlay.classList.add('hidden');
});
pauseNextBtn.addEventListener('click', () => {
  if (!progress.isUnlocked(game.levelIdx + 1)) return;
  loadLevelWithFit(game.levelIdx + 1);
  closePause();
  overlay.classList.add('hidden');
});

function dismissSplash() {
  splash.classList.add('hidden');
  splash.setAttribute('aria-hidden', 'true');
  setTimeout(() => splash.classList.add('splash--gone'), 450);
}

function renderLevelCards() {
  const fragment = document.createDocumentFragment();
  for (const meta of LEVEL_SUMMARY) {
    const unlocked = progress.isUnlocked(meta.index);
    const completed = progress.isCompleted(meta.index);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `level-card${completed ? ' level-card--complete' : ''}${unlocked ? '' : ' level-card--locked'}`;
    card.disabled = !unlocked;
    card.dataset.levelIndex = String(meta.index);
    card.innerHTML = `
      <span class="level-card-number">${completed ? '✓' : meta.index + 1}</span>
      <span class="level-card-copy">
        <strong>${meta.name}</strong>
        <small>난이도 ${meta.difficulty}/10 · 나사 ${meta.screwCount}개</small>
      </span>
      <span class="level-card-status" aria-hidden="true">${unlocked ? '›' : '🔒'}</span>
    `;
    card.addEventListener('click', () => selectLevel(meta.index));
    fragment.appendChild(card);
  }
  levelGrid.replaceChildren(fragment);
}

function openLevelPanel() {
  renderLevelCards();
  levelPanel.classList.remove('hidden');
}

function closeLevelPanel() {
  levelPanel.classList.add('hidden');
}

function selectLevel(index) {
  if (!progress.isUnlocked(index)) return;
  closeLevelPanel();
  dismissSplash();
  loadLevelWithFit(index);
  closePause();
  overlay.classList.add('hidden');
}

pauseLevelsBtn.addEventListener('click', openLevelPanel);
splashLevelsBtn.addEventListener('click', openLevelPanel);
levelPanelClose.addEventListener('click', closeLevelPanel);
levelPanel.addEventListener('pointerdown', (event) => {
  if (event.target === levelPanel) closeLevelPanel();
});

function openCreatorSecret() {
  creatorDate.value = '';
  creatorMessage.textContent = '';
  creatorForm.classList.remove('secret-card--error');
  creatorPanel.classList.remove('hidden');
  requestAnimationFrame(() => creatorDate.focus());
}

function closeCreatorSecret() {
  creatorPanel.classList.add('hidden');
  creatorDate.blur();
}

creatorTrigger.addEventListener('click', openCreatorSecret);
creatorClose.addEventListener('click', closeCreatorSecret);
creatorPanel.addEventListener('pointerdown', (event) => {
  if (event.target === creatorPanel) closeCreatorSecret();
});
creatorDate.addEventListener('input', () => {
  creatorDate.value = creatorDate.value.replace(/\D/g, '').slice(0, 8);
  creatorMessage.textContent = '';
});
creatorForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (creatorDate.value !== '20250511') {
    creatorMessage.textContent = '그 날짜가 아닌 것 같아요.';
    creatorForm.classList.remove('secret-card--error');
    void creatorForm.offsetWidth;
    creatorForm.classList.add('secret-card--error');
    creatorDate.select();
    return;
  }

  creatorMessage.textContent = '';
  closeCreatorSecret();
  closePause();
  playHeartParty();
  heartParty.burst();
  navigator.vibrate?.([65, 35, 90, 40, 140]);
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !creatorPanel.classList.contains('hidden')) {
    closeCreatorSecret();
  }
});

overlayBtn.addEventListener('click', () => {
  const hasNext = game.levelIdx + 1 < LEVEL_SUMMARY.length;
  if (game.state === 'won' && hasNext) loadLevelWithFit(game.levelIdx + 1);
  else loadLevelWithFit(game.levelIdx);
  overlay.classList.add('hidden');
});
startBtn.addEventListener('click', () => {
  resumeAudio();
  dismissSplash();
});

game.onCountChange = (remaining, total) => {
  screwCountText.textContent = `${remaining} / ${total}`;
};

// Localized result handler. Kept separate from gameplay so restarts can
// cancel a pending overlay instead of showing an obsolete result card.
let overlayTimer = null;
game.onStateChange = (state) => {
  if (overlayTimer !== null) clearTimeout(overlayTimer);
  overlayTimer = null;
  updateLevelLabels();
  screwCountText.textContent = `${game.attachedScrews().length} / ${game.totalScrews}`;
  if (state === 'won') {
    const { hasNext } = progress.complete(game.levelIdx);
    overlayEmoji.textContent = '🎉';
    overlayTitle.textContent = '집을 모두 분해했어요!';
    overlayMsg.textContent = hasNext
      ? '완벽해요! 다음 레벨이 열렸어요.'
      : '현재 준비된 모든 레벨을 완료했어요!';
    overlayBtn.textContent = hasNext ? '다음 레벨' : '다시 플레이';
    overlayTimer = setTimeout(() => {
      overlayTimer = null;
      overlay.classList.remove('hidden');
    }, 700);
    pauseNextBtn.disabled = !hasNext;
  } else if (state === 'lost') {
    overlayEmoji.textContent = '🧰';
    overlayTitle.textContent = 'Game Over';
    overlayMsg.textContent = '임시 보관함이 가득 찼어요. 순서를 바꿔 다시 도전해 보세요!';
    overlayBtn.textContent = '다시 도전';
    overlayTimer = setTimeout(() => {
      overlayTimer = null;
      overlay.classList.remove('hidden');
    }, 600);
    pauseNextBtn.disabled = true;
  } else {
    pauseNextBtn.disabled = true;
  }
};

// ---------- Initial level load (callbacks are now wired) ----------
loadLevelWithFit(progress.snapshot().maxUnlocked);

// ---------- Loop ----------
const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  controls.update();
  game.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// Read-only diagnostics used by the browser verification pass.
globalThis.__SCREWDOM_DEBUG__ = {
  snapshot: () => ({
    level: game.levelIdx + 1,
    state: game.state,
    paused: game.paused,
    remaining: game.attachedScrews().length,
    total: game.totalScrews,
    buffer: game.collector.buffer.map(entry => entry?.color ?? null),
    boxes: game.collector.activeBoxes.map(box => box
      ? { color: box.color, count: box.screwIds.length }
      : null),
    progress: progress.snapshot(),
  }),
};
