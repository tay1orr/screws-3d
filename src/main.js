import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Game } from './game.js';
import { BinView } from './2026-06-28-bin-view.js';
import { resumeAudio } from './audio.js';

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

// ---------- Ground (grass disc + shadow) ----------
const groundGroup = new THREE.Group();
const grassMat = new THREE.MeshToonMaterial({ color: 0x7cd790 });
const grass = new THREE.Mesh(new THREE.CircleGeometry(8, 48), grassMat);
grass.rotation.x = -Math.PI / 2;
grass.position.y = -0.301;
grass.receiveShadow = true;
groundGroup.add(grass);

// Soft darker ring on grass (subtle rim, not a black outline)
const ring = new THREE.Mesh(
  new THREE.RingGeometry(7.85, 8, 60),
  new THREE.MeshBasicMaterial({ color: 0x4a8a55, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = -0.300;
groundGroup.add(ring);

// Soft shadow plane beyond grass
const shadowPlane = new THREE.Mesh(
  new THREE.CircleGeometry(20, 48),
  new THREE.ShadowMaterial({ opacity: 0.28 })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -0.302;
shadowPlane.receiveShadow = true;
groundGroup.add(shadowPlane);
scene.add(groundGroup);

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
// Frame the level's attached pieces so they're fully visible under the
// tray UI band at the top. Called on level load and on window resize.
const FIT_PADDING = 0.18;       // 18% extra space around the model
const UI_TOP_FRAC = 0.22;       // ~22% of view height reserved for the tray
const VIEW_DIR = new THREE.Vector3(0.55, 0.50, 0.95).normalize();

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

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Shift the camera target DOWN a touch so the house sits in the
  // lower 2/3 of the screen, leaving room for the tray.
  center.y -= size.y * (UI_TOP_FRAC / 2);

  const vFov = camera.fov * Math.PI / 180;
  const effectiveVFov = vFov * (1 - UI_TOP_FRAC);
  const aspect = window.innerWidth / window.innerHeight;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  // Distance needed to fit each axis. Z extent is rolled into Y/X via
  // the view direction's depth component, so we just pad generously.
  const distH = (size.y / 2) / Math.tan(effectiveVFov / 2);
  const distW = (size.x / 2) / Math.tan(hFov / 2);
  const distZ = (size.z / 2) / Math.tan(Math.min(effectiveVFov, hFov) / 2);
  const dist = Math.max(distH, distW, distZ) * (1 + FIT_PADDING);

  camera.position.copy(center).addScaledVector(VIEW_DIR, dist);
  controls.target.copy(center);
  controls.minDistance = dist * 0.65;
  controls.maxDistance = dist * 1.8;
  controls.update();
}

// Wrap loadLevel so every level entry refits the camera.
function loadLevelWithFit(idx) {
  game.loadLevel(idx);
  fitCameraToLevel();
}

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitCameraToLevel();
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
const pausePanel = document.getElementById('pause-panel');
const pauseLevelLabel = document.getElementById('pause-level-label');
const pauseResumeBtn = document.getElementById('pause-resume');
const pauseRestartBtn = document.getElementById('pause-restart');
const pauseNextBtn = document.getElementById('pause-next');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const overlayEmoji = document.getElementById('overlay-emoji');
const overlayBtn = document.getElementById('overlay-btn');
const splash = document.getElementById('splash');
const startBtn = document.getElementById('start-btn');

function openPause() {
  pauseLevelLabel.textContent = `Level ${game.levelIdx + 1}`;
  pausePanel.classList.remove('hidden');
}
function closePause() {
  pausePanel.classList.add('hidden');
}
menuBtn.addEventListener('click', openPause);
pauseResumeBtn.addEventListener('click', closePause);
pauseRestartBtn.addEventListener('click', () => {
  loadLevelWithFit(game.levelIdx);
  closePause();
  overlay.classList.add('hidden');
});
pauseNextBtn.addEventListener('click', () => {
  loadLevelWithFit(game.levelIdx + 1);
  closePause();
  overlay.classList.add('hidden');
});

overlayBtn.addEventListener('click', () => {
  if (game.state === 'won') loadLevelWithFit(game.levelIdx + 1);
  else loadLevelWithFit(game.levelIdx);
  overlay.classList.add('hidden');
});
startBtn.addEventListener('click', () => {
  resumeAudio();
  splash.classList.add('hidden');
});

game.onCountChange = (remaining, total) => {
  screwCountText.textContent = `${remaining} / ${total}`;
};

game.onStateChange = (state) => {
  pauseLevelLabel.textContent = `Level ${game.levelIdx + 1}`;
  screwCountText.textContent = `${game.attachedScrews().length} / ${game.totalScrews}`;
  if (state === 'won') {
    overlayEmoji.textContent = '🎉';
    overlayTitle.textContent = '집을 분해했어요!';
    overlayMsg.textContent = '훌륭해요! 다음 집으로 가볼까요?';
    overlayBtn.textContent = '다음 레벨';
    setTimeout(() => overlay.classList.remove('hidden'), 700);
    pauseNextBtn.disabled = false;
  } else if (state === 'lost') {
    overlayEmoji.textContent = '😵';
    overlayTitle.textContent = 'Game Over';
    overlayMsg.textContent = '임시 보관함이 가득 찼어요. 다시 시도해보세요!';
    overlayBtn.textContent = '다시 시도';
    setTimeout(() => overlay.classList.remove('hidden'), 600);
    pauseNextBtn.disabled = true;
  } else {
    pauseNextBtn.disabled = true;
  }
};

// ---------- Initial level load (callbacks are now wired) ----------
loadLevelWithFit(0);

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
