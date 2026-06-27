import * as THREE from 'three';
import { generateWoodTexture } from './textures.js';

export const SCREW_COLORS = {
  red:    0xe74c3c,
  blue:   0x3aa0e9,
  green:  0x2ecc71,
  yellow: 0xf4c430,
  purple: 0x9b59b6,
  pink:   0xff5e9c,
  orange: 0xff8a3d,
  cyan:   0x29d8c3,
};

export const WOOD_COLORS = [0xc8915a, 0xa67244, 0xd9b07b, 0x8b5a2b, 0xb9844f];

const _v = new THREE.Vector3();
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

    // slot info during flight
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
    const group = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.95, roughness: 0.22 });
    const headMat = new THREE.MeshStandardMaterial({
      color: this.colorHex, metalness: 0.55, roughness: 0.35,
      emissive: this.colorHex, emissiveIntensity: 0.18,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4, roughness: 0.7 });

    // shaft (threaded look via thin rings)
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.42, 18), metal);
    shaft.position.y = -0.21;
    shaft.castShadow = true;
    group.add(shaft);

    // tip
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.08, 14), metal);
    tip.position.y = -0.46;
    group.add(tip);

    // collar (just under head)
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.03, 20), metal);
    collar.position.y = -0.01;
    group.add(collar);

    // head
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 28), headMat);
    head.position.y = 0.05;
    head.castShadow = true;
    head.userData.isHead = true;
    group.add(head);

    // head dome top (subtle)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2.4), headMat);
    dome.position.y = 0.09;
    dome.scale.y = 0.25;
    group.add(dome);

    // cross slot
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 0.035), dark);
    s1.position.y = 0.10;
    group.add(s1);
    const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.20), dark);
    s2.position.y = 0.10;
    group.add(s2);

    this._headMat = headMat;
    return group;
  }

  setBlocked(b) {
    if (this.blocked === b) return;
    this.blocked = b;
    this._headMat.emissiveIntensity = b ? 0.0 : 0.18;
    this._headMat.color.setHex(b ? this._dim(this.colorHex, 0.5) : this.colorHex);
  }

  _dim(hex, k) {
    const c = new THREE.Color(hex).multiplyScalar(k);
    return c.getHex();
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
      this.mesh.rotateOnAxis(UP, dt * 22);
      this.mesh.position.addScaledVector(this.normal, dt * 0.55);
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
      // ease in/out
      const e = t * t * (3 - 2 * t);
      // refresh target a bit in case camera moved
      const target = this.tray.getSlotWorldPos(this.slotIndex, this.stackIndex);
      this.targetPos.lerp(target, 0.25);
      // bezier
      const p01 = this.startPos.clone().lerp(this.midPos, e);
      const p12 = this.midPos.clone().lerp(this.targetPos, e);
      this.mesh.position.copy(p01.lerp(p12, e));
      this.mesh.rotateOnAxis(UP, dt * 14);
      // smoothly upright the orientation toward tray (camera) world rotation
      const camQ = new THREE.Quaternion();
      this.tray.group.getWorldQuaternion(camQ);
      this.mesh.quaternion.slerp(camQ, 0.18);
      if (t >= 1) {
        // attach to tray so it follows the camera
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
      this.mesh.position.y += dt * 1.2;
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
  constructor(size, position, rotation, woodHex) {
    this.size = size.clone();
    this.position = position.clone();
    this.rotation = rotation.clone();
    this.screws = [];
    this.state = 'attached'; // attached | falling | gone
    this.vel = new THREE.Vector3();
    this.angVel = new THREE.Vector3();

    const tex = generateWoodTexture(woodHex);
    tex.repeat.set(Math.max(1, size.x / 1.8), Math.max(1, size.z / 1.8));
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.68,
      metalness: 0.04,
      color: 0xffffff,
    });
    // softer side faces (no texture stretching): use array of materials
    const sideMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(woodHex).multiplyScalar(0.78),
      roughness: 0.75,
      metalness: 0.04,
    });
    const mats = [sideMat, sideMat, mat, mat, sideMat, sideMat];

    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), mats);
    this.mesh.position.copy(position);
    this.mesh.rotation.copy(rotation);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.userData.plank = this;
  }

  addScrew(screw) {
    this.screws.push(screw);
    screw.plank = this;
  }

  removeScrew(screw) {
    const i = this.screws.indexOf(screw);
    if (i >= 0) this.screws.splice(i, 1);
    if (this.screws.length === 0 && this.state === 'attached') {
      this.startFall();
    }
  }

  startFall() {
    this.state = 'falling';
    this.vel.set((Math.random() - 0.5) * 1.2, 0.6, (Math.random() - 0.5) * 1.2);
    this.angVel.set(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 3,
    );
  }

  update(dt) {
    if (this.state === 'falling') {
      this.vel.y -= 12 * dt;
      this.mesh.position.addScaledVector(this.vel, dt);
      this.mesh.rotation.x += this.angVel.x * dt;
      this.mesh.rotation.y += this.angVel.y * dt;
      this.mesh.rotation.z += this.angVel.z * dt;
      if (this.mesh.position.y < -12) this.state = 'gone';
    }
  }
}

// ---------- Slot Tray ----------
export class SlotTray {
  constructor() {
    this.slotCount = 3;
    this.maxPerSlot = 3;
    this.slots = [null, null, null]; // each: { color, screws[] }

    this.group = new THREE.Group();
    this._build();
  }

  _build() {
    // base tray
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x3b4768, roughness: 0.55, metalness: 0.25 });
    const tray = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.8), trayMat);
    tray.position.y = 0;
    this.group.add(tray);

    // rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x6b7aa3, roughness: 0.4, metalness: 0.5 });
    const rimGeo = new THREE.BoxGeometry(2.6, 0.04, 0.04);
    const r1 = new THREE.Mesh(rimGeo, rimMat); r1.position.set(0, 0.07, 0.4); this.group.add(r1);
    const r2 = new THREE.Mesh(rimGeo, rimMat); r2.position.set(0, 0.07, -0.4); this.group.add(r2);

    // slot holders (3 cylinders)
    this.holders = [];
    for (let i = 0; i < this.slotCount; i++) {
      const holderMat = new THREE.MeshStandardMaterial({
        color: 0x60709a, roughness: 0.45, metalness: 0.35,
        transparent: true, opacity: 0.45,
      });
      const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.55, 28, 1, true), holderMat);
      holder.position.set(-0.8 + i * 0.8, 0.31, 0);
      this.group.add(holder);
      // base disc
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 28), rimMat);
      disc.position.set(-0.8 + i * 0.8, 0.08, 0);
      this.group.add(disc);
      this.holders.push(holder);
    }
  }

  getSlotLocalPos(index, stackIndex = 0) {
    return new THREE.Vector3(-0.8 + index * 0.8, 0.18 + stackIndex * 0.18, 0);
  }

  getSlotWorldPos(index, stackIndex = 0) {
    this.group.updateMatrixWorld(true);
    return this.getSlotLocalPos(index, stackIndex).applyMatrix4(this.group.matrixWorld);
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

  checkMatch(slotIndex) {
    const s = this.slots[slotIndex];
    if (s && s.screws.length >= this.maxPerSlot) {
      const screws = s.screws.slice();
      this.slots[slotIndex] = null;
      return screws;
    }
    return null;
  }

  isAllOccupied() {
    return this.slots.every(s => s !== null);
  }

  reset() {
    this.slots = [null, null, null];
  }
}
