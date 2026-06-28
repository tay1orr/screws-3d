import * as THREE from 'three';

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
  mesh.add(outline);
  return outline;
}

const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

// ---------- Screw (smaller, lower-poly) ----------
export class Screw {
  constructor(color, worldPos, normal) {
    this.color = color;
    this.colorHex = SCREW_COLORS[color] ?? 0xcccccc;
    this.normal = normal.clone().normalize();
    this.startWorldPos = worldPos.clone();

    this.state = 'attached';
    this.blocked = false;
    this.plank = null;
    this.tray = null;
    this.slotIndex = -1;
    this.stackIndex = 0;
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
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.036, 0.26, 12), metal);
    shaft.position.y = -0.13;
    shaft.castShadow = true;
    g.add(shaft);

    // tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.06, 10), metal);
    tip.position.y = -0.29;
    g.add(tip);

    // collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.05, 0.022, 14), metal);
    collar.position.y = 0;
    g.add(collar);

    // head — smaller (0.20 → 0.13)
    const headR = 0.13;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(headR, headR, 0.07, 22), headMat);
    head.position.y = 0.045;
    head.castShadow = true;
    head.userData.isHead = true;
    g.add(head);

    // dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(headR, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.3),
      headMat
    );
    dome.position.y = 0.078;
    dome.scale.y = 0.36;
    g.add(dome);

    // cross slot
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.016, 0.034), dark);
    s1.position.y = 0.088;
    g.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.016, 0.16), dark);
    s2.position.y = 0.088;
    g.add(s2);

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

  startUnscrew(tray, slotIndex, stackIndex) {
    this.tray = tray;
    this.slotIndex = slotIndex;
    this.stackIndex = stackIndex;
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
        const target = this.tray.getSlotWorldPos(this.slotIndex, this.stackIndex);
        this.targetPos = target;
        const mid = this.startPos.clone().lerp(target, 0.5);
        mid.y = Math.max(this.startPos.y, target.y) + 1.4;
        this.midPos = mid;
      }
      return;
    }
    if (this.state === 'flying') {
      this.flightTime += dt;
      const t = Math.min(this.flightTime / this.flightDur, 1);
      const e = t * t * (3 - 2 * t);
      const liveTarget = this.tray.getSlotWorldPos(this.slotIndex, this.stackIndex);
      this.targetPos.lerp(liveTarget, 0.25);
      const p01 = this.startPos.clone().lerp(this.midPos, e);
      const p12 = this.midPos.clone().lerp(this.targetPos, e);
      this.mesh.position.copy(p01.lerp(p12, e));
      this.mesh.rotateOnAxis(UP, dt * 16);
      const camQ = new THREE.Quaternion();
      this.tray.group.getWorldQuaternion(camQ);
      this.mesh.quaternion.slerp(camQ, 0.2);
      if (t >= 1) {
        this.tray.group.attach(this.mesh);
        const localTarget = this.tray.getSlotLocalPos(this.slotIndex, this.stackIndex);
        this.mesh.position.copy(localTarget);
        this.mesh.quaternion.identity();
        this.state = 'inSlot';
      }
      return;
    }
    if (this.state === 'clearing') {
      this.clearTime += dt;
      const t = Math.min(this.clearTime / 0.35, 1);
      const s = Math.max(0, 1 - t);
      this.mesh.scale.set(s, s, s);
      this.mesh.position.y += dt * 1.4;
      if (t >= 1) this.state = 'cleared';
    }
  }

  startClear() {
    this.state = 'clearing';
    this.clearTime = 0;
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
    const mats = [sideMat, sideMat, topMat, mainMat, mainMat, mainMat];

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(this.size.x, this.size.y, this.size.z),
      mats
    );
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

// ---------- Slot Tray ----------
// 2 active bins on top (color-locked) + 5 preview dots showing upcoming colors.
// When an active bin fills with 3 same-color screws it clears and the next
// queued color slides in.
const ACTIVE_SLOTS = 2;
const PREVIEW_DOTS = 5;

export class SlotTray {
  constructor() {
    this.maxPerSlot = 3;
    this.slotCount = ACTIVE_SLOTS;
    this.activeBins = [null, null];   // {color, screws[]}
    this.queue = [];                  // upcoming colors after the 2 active
    this.group = new THREE.Group();
    this.topBinMeshes = [];
    this.previewDots = [];
    this._build();
  }

  // ---- Queue management ----
  setQueue(colors) {
    const arr = Array.isArray(colors) ? colors.slice() : [];
    this.activeBins[0] = arr[0] ? { color: arr[0], screws: [] } : null;
    this.activeBins[1] = arr[1] ? { color: arr[1], screws: [] } : null;
    this.queue = arr.slice(2);
    this.updateVisuals();
  }
  reset() {
    this.activeBins = [null, null];
    this.queue = [];
    this.updateVisuals();
  }
  // Compat shim for legacy callers
  setSlotCount(_n) {}
  get slots() { return this.activeBins; }

  // ---- Tap logic ----
  findSlotForColor(color) {
    for (let i = 0; i < ACTIVE_SLOTS; i++) {
      const b = this.activeBins[i];
      if (b && b.color === color && b.screws.length < this.maxPerSlot) return i;
    }
    return -1;
  }
  reserveSlot(screw) {
    const i = this.findSlotForColor(screw.color);
    if (i < 0) return -1;
    this.activeBins[i].screws.push(screw);
    return i;
  }
  stackIndexFor(screw, slotIndex) {
    return this.activeBins[slotIndex].screws.indexOf(screw);
  }
  checkMatch(i) {
    const b = this.activeBins[i];
    if (b && b.screws.length >= this.maxPerSlot) {
      const screws = b.screws.slice();
      const next = this.queue.shift();
      this.activeBins[i] = next ? { color: next, screws: [] } : null;
      this.updateVisuals();
      return screws;
    }
    return null;
  }
  isAllOccupied() {
    return this.activeBins.every(b => b !== null);
  }

  // ---- 3D layout ----
  _build() {
    // Top row — 2 color-locked bins
    for (let i = 0; i < ACTIVE_SLOTS; i++) {
      const x = (i - 0.5) * 1.05;
      const shellMat = new THREE.MeshToonMaterial({ color: 0xc8b89a, gradientMap: gradientMap() });
      const shell = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.46), shellMat);
      shell.position.set(x, 0.42, 0);
      this.group.add(shell);
      withOutline(shell, 1.025, 0x4a3220);
      this.topBinMeshes.push(shell);

      // inner cream face (acts as a "tray plate" inside the bin)
      const inner = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.62, 0.04),
        new THREE.MeshToonMaterial({ color: 0xfff4dc, gradientMap: gradientMap() })
      );
      inner.position.set(x, 0.42, 0.21);
      this.group.add(inner);
    }

    // Bottom row — 5 preview dots
    for (let j = 0; j < PREVIEW_DOTS; j++) {
      const x = (j - 2) * 0.46;
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 0.045, 24),
        new THREE.MeshToonMaterial({ color: 0x8e9bb0, gradientMap: gradientMap() })
      );
      ring.position.set(x, -0.10, 0);
      this.group.add(ring);

      const dot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.05, 22),
        new THREE.MeshToonMaterial({ color: 0xb6c1d2, gradientMap: gradientMap() })
      );
      dot.position.set(x, -0.07, 0);
      this.group.add(dot);
      this.previewDots.push(dot);
    }
  }

  updateVisuals() {
    for (let i = 0; i < ACTIVE_SLOTS; i++) {
      const b = this.activeBins[i];
      const shell = this.topBinMeshes[i];
      if (!shell) continue;
      shell.material.color.setHex(b ? SCREW_COLORS[b.color] : 0xc8b89a);
    }
    for (let j = 0; j < PREVIEW_DOTS; j++) {
      const c = this.queue[j];
      const dot = this.previewDots[j];
      if (!dot) continue;
      dot.material.color.setHex(c ? SCREW_COLORS[c] : 0xb6c1d2);
    }
  }

  getSlotLocalPos(i, stack = 0) {
    const x = (i - 0.5) * 1.05;
    // 3 screws line up horizontally inside the bin, slightly in front of the inner plate
    return new THREE.Vector3(x + (stack - 1) * 0.17, 0.42, 0.28);
  }
  getSlotWorldPos(i, stack = 0) {
    this.group.updateMatrixWorld(true);
    return this.getSlotLocalPos(i, stack).applyMatrix4(this.group.matrixWorld);
  }
}
