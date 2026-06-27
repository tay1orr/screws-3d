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
const screwCountText = document.getElementById('screw-count-text');
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

game.onCountChange = (remaining, total) => {
  screwCountText.textContent = `${remaining} / ${total}`;
};

game.onStateChange = (state) => {
  levelLabel.textContent = `Level ${game.levelIdx + 1}`;
  screwCountText.textContent = `${game.attachedScrews().length} / ${game.totalScrews}`;
  if (state === 'won') {
    overlayEmoji.textContent = '🎉';
    overlayTitle.textContent = '집을 분해했어요!';
    overlayMsg.textContent = '훌륭해요! 다음 집으로 가볼까요?';
    overlayBtn.textContent = '다음 레벨';
    setTimeout(() => overlay.classList.remove('hidden'), 700);
    nextBtn.disabled = false;
  } else if (state === 'lost') {
    overlayEmoji.textContent = '😵';
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
