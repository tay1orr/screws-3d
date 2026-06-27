import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Game } from './game.js';
import { resumeAudio } from './audio.js';

// ---------- Renderer ----------
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);

// ---------- Scene ----------
const scene = new THREE.Scene();
// gradient sky-like background via vertex-colored sphere
const skyGeo = new THREE.SphereGeometry(60, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  uniforms: {
    topColor: { value: new THREE.Color(0x1a2240) },
    botColor: { value: new THREE.Color(0x05060f) },
  },
  vertexShader: `
    varying vec3 vWorldPos;
    void main() {
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 botColor;
    varying vec3 vWorldPos;
    void main() {
      float h = normalize(vWorldPos).y * 0.5 + 0.5;
      gl_FragColor = vec4(mix(botColor, topColor, smoothstep(0.0, 0.7, h)), 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));
scene.fog = new THREE.Fog(0x0e1530, 14, 32);

// ---------- Camera ----------
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 4.5, 9);
scene.add(camera);

// ---------- Lights ----------
scene.add(new THREE.AmbientLight(0x8a9bc7, 0.65));

const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(6, 12, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9;
sc.near = 0.5; sc.far = 30;
sun.shadow.bias = -0.0008;
sun.shadow.radius = 4;
scene.add(sun);

const rim = new THREE.DirectionalLight(0x6f93ff, 0.45);
rim.position.set(-6, 4, -6);
scene.add(rim);

const fill = new THREE.DirectionalLight(0xffd6a0, 0.18);
fill.position.set(2, 3, -8);
scene.add(fill);

// ---------- Ground (shadow catcher) ----------
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(20, 48),
  new THREE.ShadowMaterial({ opacity: 0.32 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -3;
ground.receiveShadow = true;
scene.add(ground);

// ---------- Controls ----------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.minPolarAngle = 0.18;
controls.maxPolarAngle = Math.PI / 2 - 0.08;
controls.minDistance = 6;
controls.maxDistance = 14;
controls.enablePan = false;
controls.rotateSpeed = 0.8;
controls.target.set(0, 0.3, 0);
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

// ---------- Game ----------
const game = new Game(scene, camera);
game.loadLevel(0);

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
  const meshes = game.attachedScrews().map(s => s.mesh);
  if (meshes.length === 0) return;
  const hits = raycaster.intersectObjects(meshes, true);
  for (const hit of hits) {
    let o = hit.object;
    while (o && !o.userData.screw) o = o.parent;
    if (o && o.userData.screw) {
      game.trySelectScrew(o.userData.screw);
      break;
    }
  }
}

// ---------- Resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- HUD ----------
const levelLabel = document.getElementById('level-label');
const restartBtn = document.getElementById('restart');
const nextBtn = document.getElementById('next');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const overlayEmoji = document.getElementById('overlay-emoji');
const overlayBtn = document.getElementById('overlay-btn');
const splash = document.getElementById('splash');
const startBtn = document.getElementById('start-btn');

restartBtn.addEventListener('click', () => {
  game.loadLevel(game.levelIdx);
  overlay.classList.add('hidden');
});
nextBtn.addEventListener('click', () => {
  game.loadLevel(game.levelIdx + 1);
  overlay.classList.add('hidden');
});
overlayBtn.addEventListener('click', () => {
  if (game.state === 'won') game.loadLevel(game.levelIdx + 1);
  else game.loadLevel(game.levelIdx);
  overlay.classList.add('hidden');
});
startBtn.addEventListener('click', () => {
  resumeAudio();
  splash.classList.add('hidden');
});

game.onStateChange = (state) => {
  levelLabel.textContent = `Level ${game.levelIdx + 1}`;
  if (state === 'won') {
    overlayEmoji.textContent = '🎉';
    overlayTitle.textContent = 'Level Complete!';
    overlayMsg.textContent = '훌륭해요! 다음 레벨로 가볼까요?';
    overlayBtn.textContent = '다음 레벨';
    setTimeout(() => overlay.classList.remove('hidden'), 700);
    nextBtn.disabled = false;
  } else if (state === 'lost') {
    overlayEmoji.textContent = '💥';
    overlayTitle.textContent = 'Game Over';
    overlayMsg.textContent = '슬롯이 가득 찼어요. 다시 시도해보세요!';
    overlayBtn.textContent = '다시 시도';
    setTimeout(() => overlay.classList.remove('hidden'), 600);
    nextBtn.disabled = true;
  } else {
    nextBtn.disabled = true;
  }
};

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
