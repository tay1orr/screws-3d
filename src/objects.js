import * as THREE from 'three';

// ---------- Palette (warm orange/cream cartoon) ----------
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
  foundation: 0xf6d8a0, // warm cream foundation
  foundationDark: 0xd6a868,
  wall:       0xfde0b0, // cream wall
  wallAlt:    0xfacba1, // light peach
  trim:       0xff9543, // orange trim
  roof:       0xff8c42, // bright orange roof
  roofDark:   0xc66b2c, // shadow
  door:       0xff7a30, // strong orange door
  doorDark:   0xa84510,
  window:     0xffd13a, // yellow glass
  windowFrame:0xff8c42, // orange frame
  chimney:    0xfff0d8, // off-white chimney
  chimneyTop: 0xc66b2c,
  grass:      0x7cd790,
};

// ---------- Toon shading helpers ----------
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

// Soft outline: very thin, just a dark version of the surface tint
function withOutline(mesh, scale = 1.012, color = null) {
  const c = color ?? darken(getMeshTint(mesh), 0.45);
  const outlineMat = new THREE.MeshBasicMaterial({ color: c, side: THREE.BackSide });
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.setScalar(scale);
  outline.userData.isOutline = true;
  mesh.add(outline);
  return outline;
}

function getMeshTint(mesh) {
  const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return m?.color?.getHex() ?? 0x553311;
}
function darken(hex, k) {
  return new THREE.Color(hex).multiplyScalar(k).getHex();
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
    headMat.emissive = new THREE.Color(this.colorHex).multiplyScalar(0.12);
    const dark = new THREE.MeshBasicMaterial({ color: darken(this.colorHex, 0.3) });

    // shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.38, 14), metal);
    shaft.position.y = -0.20;
    shaft.castShadow = true;
    g.add(shaft);

    // tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 12), metal);
    tip.position.y = -0.44;
    g.add(tip);

    // collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.07, 0.035, 18), metal);
    collar.position.y = 0.0;
    g.add(collar);

    // head — large, plastic cartoon look
    const headR = 0.20;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(headR, headR, 0.10, 28), headMat);
    head.position.y = 0.065;
    head.castShadow = true;
    head.userData.isHead = true;
    g.add(head);

    // dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(headR, 26, 16, 0, Math.PI * 2, 0, Math.PI / 2.3),
      headMat
    );
    dome.position.y = 0.115;
    dome.scale.y = 0.36;
    g.add(dome);

    // recessed cross slot (darker, no thick block — looks cleaner)
    const slotMat = dark;
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.05), slotMat);
    s1.position.y = 0.13;
    g.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.24), slotMat);
    s2.position.y = 0.13;
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
      this._headMat.emissive.copy(c).multiplyScalar(0.12);
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
        mid.y = Math.max(this.startPos.y, target.y) + 1.5;
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

    // very subtle outline only — no thick cartoon line
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
// 7 slots laid out as 2 large bins on top + 5 small dots on bottom.
// All slots are functionally identical: each holds up to 3 same-color screws,
// then clears on match. The visual split mirrors the reference UI.
const TOP_ROW    = 2;
const BOTTOM_ROW = 5;
const TOTAL_SLOTS = TOP_ROW + BOTTOM_ROW;

export class SlotTray {
  constructor() {
    this.slotCount = TOTAL_SLOTS;
    this.maxPerSlot = 3;
    this.slots = new Array(TOTAL_SLOTS).fill(null);
    this.group = new THREE.Group();
    this._build();
  }

  // kept for API compatibility — slot count is fixed
  setSlotCount(_n) { this.reset(); }

  _build() {
    const trayMat   = makeToonMat(0xffffff);
    const rimMat    = makeToonMat(HOUSE.trim);
    const dotMat    = new THREE.MeshToonMaterial({ color: 0x9aa6b8, gradientMap: gradientMap() });
    const dotBase   = new THREE.MeshToonMaterial({ color: 0x5e6878, gradientMap: gradientMap() });
    const binShellMat = new THREE.MeshToonMaterial({ color: 0xf6efe2, gradientMap: gradientMap() });

    // Top row: two rounded "bin" containers
    for (let i = 0; i < TOP_ROW; i++) {
      const x = (-0.5 + i) * 1.1;
      // outer shell (rounded square look via slight bevel)
      const shell = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.5), binShellMat);
      shell.position.set(x, 0.50, 0);
      this.group.add(shell);
      withOutline(shell, 1.025, 0x6b4a2a);
      // rim border
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.10, 0.5), rimMat);
      rim.position.set(x, 0.50 + 0.42, 0);
      this.group.add(rim);
      const rim2 = rim.clone();
      rim2.position.set(x, 0.50 - 0.42, 0);
      this.group.add(rim2);
      // inner cylinder slot where screws stack
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.55, 24, 1, true),
        new THREE.MeshToonMaterial({
          color: 0xc3e0ff, gradientMap: gradientMap(),
          transparent: true, opacity: 0.55,
        })
      );
      inner.position.set(x, 0.50, 0.08);
      this.group.add(inner);
    }

    // Bottom row: five small disc slots
    for (let j = 0; j < BOTTOM_ROW; j++) {
      const x = (-2 + j) * 0.42;
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.06, 24),
        dotMat
      );
      ring.position.set(x, -0.15, 0);
      this.group.add(ring);
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.04, 22),
        dotBase
      );
      disc.position.set(x, -0.13, 0);
      this.group.add(disc);
    }
  }

  getSlotLocalPos(i, stack = 0) {
    if (i < TOP_ROW) {
      const x = (-0.5 + i) * 1.1;
      return new THREE.Vector3(x, 0.30 + stack * 0.22, 0.08);
    } else {
      const j = i - TOP_ROW;
      const x = (-2 + j) * 0.42;
      return new THREE.Vector3(x, -0.05 + stack * 0.18, 0);
    }
  }

  getSlotWorldPos(i, stack = 0) {
    this.group.updateMatrixWorld(true);
    return this.getSlotLocalPos(i, stack).applyMatrix4(this.group.matrixWorld);
  }

  findSlotForColor(color) {
    // Prefer reusing a slot already collecting this color
    for (let i = 0; i < this.slotCount; i++) {
      const s = this.slots[i];
      if (s && s.color === color && s.screws.length < this.maxPerSlot) return i;
    }
    // Else fill from top row first (visually primary), then bottom queue
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
  reset() { this.slots = new Array(TOTAL_SLOTS).fill(null); }
}
