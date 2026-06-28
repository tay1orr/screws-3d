import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------- Palette ----------
export const SCREW_COLORS = {
  red:    0xff5252,
  blue:   0x3a8ee0,
  green:  0x55cf65,
  yellow: 0xffd542,
  orange: 0xff9543,
  pink:   0xff8ec7,
  purple: 0xa75fdd,
  cyan:   0x3ee0d0,
  brown:  0x9a5d2d,
  white:  0xeff2f5,
};

export const HOUSE = {
  foundation: 0xf6d8a0,
  wall:       0xfde0b0,
  wallAlt:    0xfacba1,
  trim:       0xff9543,
  roof:       0xff8c42,
  roofDark:   0xc66b2c,
  door:       0xff7a30,
  doorDark:   0xa84510,
  window:     0xffd13a,
  windowFrame:0xff8c42,
  chimney:    0xfff0d8,
  chimneyTop: 0xc66b2c,
  innerFloor: 0xefc88a,
  atticBeam:  0xb38247,
  garden:     0x8fcf68,
};

// ---------- Toon ----------
let _gradMap = null;
function gradientMap() {
  if (_gradMap) return _gradMap;
  const data = new Uint8Array([100, 170, 220, 255]);
  _gradMap = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  _gradMap.minFilter = THREE.NearestFilter;
  _gradMap.magFilter = THREE.NearestFilter;
  _gradMap.needsUpdate = true;
  return _gradMap;
}
function makeToonMat(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() });
}
function darken(hex, k) {
  return new THREE.Color(hex).multiplyScalar(k).getHex();
}
function withOutline(mesh, scale = 1.012, color = null) {
  const c = color ?? darken(mesh.material?.color?.getHex?.() ?? 0x553311, 0.45);
  const outlineMat = new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide });
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.setScalar(scale);
  outline.userData.isOutline = true;
  // Outlines must never participate in raycasts — they'd create phantom
  // hits in front of the real mesh and let the player tap through walls.
  outline.raycast = () => {};
  mesh.add(outline);
  return outline;
}

const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

let _nextScrewId = 1;

// ---------- Screw (smaller, lower-poly) ----------
export class Screw {
  constructor(color, worldPos, normal) {
    this.id = _nextScrewId++;
    this.color = color;
    this.colorHex = SCREW_COLORS[color] ?? 0xcccccc;
    this.normal = normal.clone().normalize();
    this.startWorldPos = worldPos.clone();

    this.state = 'attached';
    this.blocked = false;
    this.plank = null;
    this.tray = null;
    // target = { type:'box', boxIndex, stackIndex } | { type:'buffer', slotIndex }
    this.target = null;
    this.spinTime = 0;
    this.flightTime = 0;
    this.flightDur = 0.55;
    this.clearTime = 0;
    this.startPos = null;
    this.midPos = null;
    this.targetPos = null;

    this.mesh = this._createMesh();
    this.mesh.position.copy(worldPos);
    _q.setFromUnitVectors(UP, this.normal);
    this.mesh.quaternion.copy(_q);
    this.mesh.userData.screw = this;
  }

  _createMesh() {
    const g = new THREE.Group();
    const metal = makeToonMat(0xb8b6b2);
    const headMat = makeToonMat(this.colorHex);
    headMat.emissive = new THREE.Color(this.colorHex).multiplyScalar(0.08);
    const dark = new THREE.MeshBasicMaterial({ color: darken(this.colorHex, 0.3) });

    // shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.027, 0.20, 12), metal);
    shaft.position.y = -0.10;
    shaft.castShadow = true;
    g.add(shaft);

    // Three subtle thread rings make the screw read as metal hardware while
    // keeping the silhouette light enough for mobile rendering.
    for (const y of [-0.065, -0.105, -0.145]) {
      const thread = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.006, 5, 12), metal);
      thread.rotation.x = Math.PI / 2;
      thread.position.y = y;
      g.add(thread);
    }

    // tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.027, 0.045, 10), metal);
    tip.position.y = -0.225;
    g.add(tip);

    // collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.038, 0.017, 14), metal);
    collar.position.y = 0;
    g.add(collar);

    // head — flat plastic cap (coin shape, no dome)
    const headR = 0.100;
    const headH = 0.040;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(headR, headR, headH, 24), headMat);
    head.position.y = 0.020;        // top face at y = 0.040
    head.castShadow = true;
    head.userData.isHead = true;
    g.add(head);

    // Cross slot — perched just above the head's top face, smaller than
    // before so it reads as a notch rather than a stamp.
    const slotW = 0.135;
    const slotT = 0.003;
    const slotZ = 0.028;
    const slotY = 0.0415;           // nearly flush: reads as a recessed groove
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(slotW, slotT, slotZ), dark);
    s1.position.y = slotY;
    g.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(slotZ, slotT, slotW), dark);
    s2.position.y = slotY;
    g.add(s2);

    const rimMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.38 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.78, 0.006, 6, 24), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.042;
    g.add(rim);

    this._headMat = headMat;
    return g;
  }

  setBlocked(b) {
    if (this.blocked === b) return;
    this.blocked = b;
    const c = new THREE.Color(this.colorHex);
    if (b) {
      this._headMat.color.copy(c).multiplyScalar(0.55);
      this._headMat.emissive.setHex(0x000000);
    } else {
      this._headMat.color.copy(c);
      this._headMat.emissive.copy(c).multiplyScalar(0.08);
    }
  }

  // viewProj.getTargetWorldPos(target) → THREE.Vector3 in world space.
  // The view provider unprojects the DOM bin's screen position through
  // the perspective camera, so the 3D screw flies straight to the DOM
  // bin's pixel coordinates regardless of camera angle or viewport size.
  startUnscrew(viewProj, target) {
    this.viewProj = viewProj;
    this.target = target;
    this.state = 'spinning';
    this.spinTime = 0;
    this.startPos = this.mesh.position.clone();
  }

  update(dt) {
    if (this.state === 'spinning') {
      this.spinTime += dt;
      this.mesh.rotateOnAxis(UP, dt * 26);
      this.mesh.position.addScaledVector(this.normal, dt * 0.6);
      if (this.spinTime > 0.32) {
        this.state = 'flying';
        this.flightTime = 0;
        this.startPos = this.mesh.position.clone();
        const target = this.viewProj.getTargetWorldPos(this.target);
        this.targetPos = target.clone();
        const mid = this.startPos.clone().lerp(target, 0.5);
        mid.y = Math.max(this.startPos.y, target.y) + 1.2;
        this.midPos = mid;
      }
      return;
    }
    if (this.state === 'flying') {
      this.flightTime += dt;
      const t = Math.min(this.flightTime / this.flightDur, 1);
      const e = t * t * (3 - 2 * t);
      // Live-update target so a moving camera doesn't drift the landing
      // point off the DOM bin's actual pixel position.
      const liveTarget = this.viewProj.getTargetWorldPos(this.target);
      this.targetPos.lerp(liveTarget, 0.35);
      const p01 = this.startPos.clone().lerp(this.midPos, e);
      const p12 = this.midPos.clone().lerp(this.targetPos, e);
      this.mesh.position.copy(p01.lerp(p12, e));
      this.mesh.rotateOnAxis(UP, dt * 16);
      if (t >= 1) {
        // Don't reparent — game.js will destroy the 3D mesh and ask the
        // DOM BinView to create a head token in its place.
        this.state = 'landed';
      }
      return;
    }
    // Auto-transfer + clear are DOM-token concerns now; nothing 3D to do
    // for screws in those collector states.
  }
}

// ---------- Plank ----------
export class Plank {
  constructor(spec) {
    this.spec = spec;
    this.size = new THREE.Vector3().fromArray(spec.size);
    this.position = new THREE.Vector3().fromArray(spec.pos);
    this.rotation = new THREE.Euler().fromArray(spec.rot);
    this.screws = [];
    this.state = 'attached';
    this.vel = new THREE.Vector3();
    this.angVel = new THREE.Vector3();

    const base = spec.color ?? HOUSE.wall;
    const top  = spec.topColor ?? base;
    const sideHex = darken(base, 0.88);
    const mainMat = makeToonMat(base);
    const topMat  = makeToonMat(top);
    const sideMat = makeToonMat(sideHex);

    // Pieces with a distinct top colour (chimney, door, window) keep a
    // multi-material BoxGeometry so each face can be tinted separately.
    // Plain single-colour pieces (walls, foundation, roof, inner floor)
    // use RoundedBoxGeometry so their silhouettes read as cartoon shapes.
    const wantsMultiColor = !!spec.topColor && spec.topColor !== base;
    if (wantsMultiColor) {
      const mats = [sideMat, sideMat, topMat, mainMat, mainMat, mainMat];
      this.mesh = new THREE.Mesh(
        new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z),
        mats
      );
    } else {
      const minDim = Math.min(this.size.x, this.size.y, this.size.z);
      const radius = Math.min(0.05, minDim * 0.18);
      this.mesh = new THREE.Mesh(
        new RoundedBoxGeometry(this.size.x, this.size.y, this.size.z, 3, radius),
        mainMat
      );
    }
    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.plank = this;
    withOutline(this.mesh, 1.008, darken(base, 0.4));
  }

  addScrew(s) { this.screws.push(s); s.plank = this; }
  removeScrew(s) {
    const i = this.screws.indexOf(s);
    if (i >= 0) this.screws.splice(i, 1);
    if (this.screws.length === 0 && this.state === 'attached') this.startFall();
  }
  startFall() {
    this.state = 'falling';
    this.vel.set((Math.random() - 0.5) * 1.4, 0.85, (Math.random() - 0.5) * 1.4);
    this.angVel.set(
      (Math.random() - 0.5) * 3.6,
      (Math.random() - 0.5) * 3.6,
      (Math.random() - 0.5) * 3.6,
    );
  }
  update(dt) {
    if (this.state === 'falling') {
      this.vel.y -= 13 * dt;
      this.mesh.position.addScaledVector(this.vel, dt);
      this.mesh.rotation.x += this.angVel.x * dt;
      this.mesh.rotation.y += this.angVel.y * dt;
      this.mesh.rotation.z += this.angVel.z * dt;
      if (this.mesh.position.y < -16) this.state = 'gone';
    }
  }
}

// SlotTray was removed in Phase B. The collection UI lives in the DOM —
// see src/2026-06-28-bin-view.js. Screw flight targets come from a
// viewProj helper that unprojects DOM bin pixel coordinates through the
// perspective camera.
