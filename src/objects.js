import * as THREE from 'three';

// ---------- Palette ----------
export const SCREW_COLORS = {
  red:    0xff4b5c,
  blue:   0x3aa6ff,
  green:  0x46d36b,
  yellow: 0xffce3a,
  purple: 0xb877ff,
  pink:   0xff77b3,
  orange: 0xff9543,
  cyan:   0x3ee0d0,
};

export const HOUSE = {
  wall:       0xfde6c4, // cream
  wallAlt:    0xfbcaa0, // peach
  wallCold:   0xc6e4ff, // pastel blue (for variety)
  roof:       0xf04a4a, // bright red
  roofAlt:    0xff9430, // orange terracotta
  foundation: 0x8a796a, // warm gray
  door:       0x5a3a22, // dark wood
  window:     0x9adcff, // light blue
  chimney:    0xb3563f, // brick
  garden:     0x6dd685, // grass green
  porch:      0xe6c188, // light wood
};

// ---------- Toon shading helpers ----------
let _gradMap = null;
function gradientMap() {
  if (_gradMap) return _gradMap;
  const data = new Uint8Array([80, 140, 200, 245, 255]);
  _gradMap = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  _gradMap.minFilter = THREE.NearestFilter;
  _gradMap.magFilter = THREE.NearestFilter;
  _gradMap.needsUpdate = true;
  return _gradMap;
}

function makeToonMat(color) {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() });
}

// Backside-outline trick — a slightly enlarged inverted-normal copy renders behind.
function withOutline(mesh, scale = 1.04, color = 0x1c2230) {
  const outlineMat = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.setScalar(scale);
  outline.userData.isOutline = true;
  mesh.add(outline);
  return outline;
}

const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

// ---------- Screw ----------
export class Screw {
  constructor(color, worldPos, normal) {
    this.color = color;
    this.colorHex = SCREW_COLORS[color] ?? 0xcccccc;
    this.normal = normal.clone().normalize();
    this.startWorldPos = worldPos.clone();

    this.state = 'attached'; // attached | spinning | flying | inSlot | clearing | cleared
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
    const metal = makeToonMat(0xdde2ea);
    const headMat = makeToonMat(this.colorHex);
    headMat.emissive = new THREE.Color(this.colorHex).multiplyScalar(0.18);
    const dark = new THREE.MeshBasicMaterial({ color: 0x141821 });
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.42, 18), metal);
    shaft.position.y = -0.21;
    shaft.castShadow = true;
    g.add(shaft);

    // tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.10, 16), metal);
    tip.position.y = -0.48;
    g.add(tip);

    // collar (small ring just under head)
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.085, 0.04, 22), metal);
    collar.position.y = 0.0;
    g.add(collar);

    // head — chunky for cartoon read
    const headRadius = 0.20;
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(headRadius, headRadius, 0.11, 32),
      headMat
    );
    head.position.y = 0.075;
    head.castShadow = true;
    head.userData.isHead = true;
    g.add(head);
    withOutline(head, 1.06);

    // soft dome on top
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius, 30, 18, 0, Math.PI * 2, 0, Math.PI / 2.3),
      headMat
    );
    dome.position.y = 0.13;
    dome.scale.y = 0.32;
    g.add(dome);

    // tiny white highlight (top-left of dome) — gives plastic cartoon shine
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), white);
    shine.position.set(-0.07, 0.155, -0.06);
    shine.scale.set(1, 0.5, 1);
    g.add(shine);

    // cross slot (thicker for visibility)
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.028, 0.05), dark);
    s1.position.y = 0.14;
    g.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.028, 0.27), dark);
    s2.position.y = 0.14;
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
      this._headMat.emissive.copy(c).multiplyScalar(0.18);
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
      this.mesh.position.addScaledVector(this.normal, dt * 0.62);
      if (this.spinTime > 0.32) {
        this.state = 'flying';
        this.flightTime = 0;
        this.startPos = this.mesh.position.clone();
        const target = this.tray.getSlotWorldPos(this.slotIndex, this.stackIndex);
        this.targetPos = target;
        const mid = this.startPos.clone().lerp(target, 0.5);
        mid.y = Math.max(this.startPos.y, target.y) + 1.6;
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

// ---------- Plank / Piece ----------
// spec: { size:[x,y,z], pos:[x,y,z], rot:[x,y,z], color:hex, topColor?:hex, screws:[] }
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

    const baseColor = spec.color ?? HOUSE.wall;
    const topColor  = spec.topColor ?? baseColor;
    const mainMat = makeToonMat(baseColor);
    const topMat  = makeToonMat(topColor);
    const darkCol = new THREE.Color(baseColor).multiplyScalar(0.82).getHex();
    const sideMat = makeToonMat(darkCol);

    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
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

    withOutline(this.mesh, 1.025);
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

// ---------- Decoration (no screws, just visual flair) ----------
// Used for windows, doors, garden tiles, etc. that should fall along with their parent.
export class Decoration {
  constructor(spec) {
    this.spec = spec;
    const size = new THREE.Vector3().fromArray(spec.size);
    const mat = makeToonMat(spec.color ?? 0xffffff);
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mat);
    this.mesh.position.fromArray(spec.pos);
    if (spec.rot) this.mesh.rotation.fromArray(spec.rot);
    withOutline(this.mesh, 1.03);
  }
}

// ---------- Slot Tray ----------
export class SlotTray {
  constructor() {
    this.slotCount = 3;
    this.maxPerSlot = 3;
    this.slots = [null, null, null];
    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    const trayMat = makeToonMat(0xf8efdc);
    const rimMat  = makeToonMat(0xd5a866);
    const holderMat = new THREE.MeshToonMaterial({
      color: 0xc3e0ff,
      gradientMap: gradientMap(),
      transparent: true,
      opacity: 0.55,
    });

    const tray = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.18, 0.95), trayMat);
    this.group.add(tray);
    withOutline(tray, 1.025);

    const rimGeo = new THREE.BoxGeometry(2.85, 0.07, 0.07);
    for (const z of [0.46, -0.46]) {
      const r = new THREE.Mesh(rimGeo, rimMat);
      r.position.set(0, 0.12, z);
      this.group.add(r);
    }

    this.holders = [];
    for (let i = 0; i < this.slotCount; i++) {
      const holder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.62, 30, 1, true),
        holderMat
      );
      holder.position.set(-0.9 + i * 0.9, 0.42, 0);
      this.group.add(holder);

      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.26, 0.05, 30),
        rimMat
      );
      disc.position.set(-0.9 + i * 0.9, 0.12, 0);
      this.group.add(disc);
      withOutline(disc, 1.04);

      this.holders.push(holder);
    }
  }

  getSlotLocalPos(i, stack = 0) {
    return new THREE.Vector3(-0.9 + i * 0.9, 0.23 + stack * 0.22, 0);
  }
  getSlotWorldPos(i, stack = 0) {
    this.group.updateMatrixWorld(true);
    return this.getSlotLocalPos(i, stack).applyMatrix4(this.group.matrixWorld);
  }
  findSlotForColor(color) {
    for (let i = 0; i < this.slotCount; i++) {
      const s = this.slots[i];
      if (s && s.color === color && s.screws.length < this.maxPerSlot) return i;
    }
    for (let i = 0; i < this.slotCount; i++) if (!this.slots[i]) return i;
    return -1;
  }
  reserveSlot(screw) {
    const i = this.findSlotForColor(screw.color);
    if (i < 0) return -1;
    if (!this.slots[i]) this.slots[i] = { color: screw.color, screws: [] };
    this.slots[i].screws.push(screw);
    return i;
  }
  stackIndexFor(screw, slotIndex) {
    return this.slots[slotIndex].screws.indexOf(screw);
  }
  checkMatch(i) {
    const s = this.slots[i];
    if (s && s.screws.length >= this.maxPerSlot) {
      const screws = s.screws.slice();
      this.slots[i] = null;
      return screws;
    }
    return null;
  }
  isAllOccupied() { return this.slots.every(s => s !== null); }
  reset() { this.slots = [null, null, null]; }
}
