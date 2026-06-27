import * as THREE from 'three';
import { Screw, Plank, SlotTray, WOOD_COLORS } from './objects.js';
import { LEVELS } from './levels.js';
import {
  playClick, playUnscrew, playSlot, playMatch,
  playWin, playLose, playThud, playBlocked,
} from './audio.js';

const _ray = new THREE.Raycaster();

export class Game {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.tray = new SlotTray();
    // tray is a child of camera so it always sits in screen space
    camera.add(this.tray.group);
    this.tray.group.position.set(0, -1.55, -4.2);
    this.tray.group.scale.set(0.9, 0.9, 0.9);

    this.planks = [];
    this.screws = [];
    this.levelIdx = 0;
    this.state = 'playing'; // playing | won | lost
    this.onStateChange = null;

    this._particles = [];
  }

  loadLevel(idx) {
    // clear previous level
    for (const p of this.planks) {
      if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
    }
    for (const s of this.screws) {
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
    }
    for (const sp of this._particles) {
      if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh);
    }
    this._particles = [];
    this.planks = [];
    this.screws = [];
    this.tray.reset();
    this._winFiredAt = 0;

    this.levelIdx = ((idx % LEVELS.length) + LEVELS.length) % LEVELS.length;
    this.state = 'playing';

    const spec = LEVELS[this.levelIdx];
    for (const ps of spec) {
      const plank = new Plank(ps.size, ps.pos, ps.rot, WOOD_COLORS[ps.woodIdx % WOOD_COLORS.length]);
      this.scene.add(plank.mesh);
      this.planks.push(plank);

      for (const ss of ps.screws) {
        const worldPos = plank.mesh.localToWorld(ss.localPos.clone());
        const worldNormal = ss.normal.clone().applyQuaternion(plank.mesh.quaternion).normalize();
        const screw = new Screw(ss.color, worldPos, worldNormal);
        this.scene.add(screw.mesh);
        plank.addScrew(screw);
        this.screws.push(screw);
      }
    }

    this._updateBlocking();
    this._emit();
  }

  attachedScrews() {
    return this.screws.filter(s => s.state === 'attached');
  }

  _updateBlocking() {
    const plankMeshes = this.planks
      .filter(p => p.state === 'attached')
      .map(p => p.mesh);

    for (const screw of this.screws) {
      if (screw.state !== 'attached') continue;
      // Cast a ray from just above the screw head, along the outward normal,
      // looking for any other plank that would prevent extraction.
      const origin = screw.mesh.position.clone().addScaledVector(screw.normal, 0.18);
      _ray.set(origin, screw.normal);
      _ray.far = 3.0;
      const hits = _ray.intersectObjects(plankMeshes, false);
      let blocked = false;
      for (const h of hits) {
        if (h.object !== screw.plank.mesh) { blocked = true; break; }
      }
      screw.setBlocked(blocked);
    }
  }

  trySelectScrew(screw) {
    if (this.state !== 'playing') return;
    if (screw.state !== 'attached') return;

    if (screw.blocked) {
      playBlocked();
      this._shake(screw);
      return;
    }

    const slotIdx = this.tray.reserveSlot(screw);
    if (slotIdx < 0) {
      playBlocked();
      this._shake(screw);
      return;
    }

    const stackIdx = this.tray.stackIndexFor(screw, slotIdx);
    playUnscrew();
    screw.startUnscrew(this.tray, slotIdx, stackIdx);
    screw.plank.removeScrew(screw);

    if (screw.plank.state === 'falling') {
      setTimeout(() => playThud(), 280);
    }
  }

  _shake(screw) {
    const orig = screw.mesh.position.clone();
    const startT = performance.now();
    const dur = 220;
    const tick = () => {
      const t = (performance.now() - startT) / dur;
      if (t >= 1) {
        screw.mesh.position.copy(orig);
        return;
      }
      const k = Math.sin(t * 30) * 0.04 * (1 - t);
      screw.mesh.position.copy(orig).addScaledVector(screw.normal, k);
      requestAnimationFrame(tick);
    };
    tick();
  }

  _burstParticles(worldPos, colorHex) {
    const count = 18;
    const geo = new THREE.SphereGeometry(0.06, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(worldPos);
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.6 + 0.2,
        Math.random() - 0.5,
      ).normalize();
      const speed = 1.5 + Math.random() * 2.5;
      this.scene.add(m);
      this._particles.push({
        mesh: m,
        vel: dir.multiplyScalar(speed),
        life: 0,
        max: 0.6 + Math.random() * 0.3,
      });
    }
  }

  update(dt) {
    // update entities
    for (const s of this.screws) s.update(dt);
    for (const p of this.planks) p.update(dt);

    // particles
    for (const sp of this._particles) {
      sp.life += dt;
      sp.vel.y -= 6 * dt;
      sp.mesh.position.addScaledVector(sp.vel, dt);
      const k = Math.max(0, 1 - sp.life / sp.max);
      sp.mesh.scale.setScalar(k);
    }
    this._particles = this._particles.filter(sp => {
      if (sp.life >= sp.max) {
        if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh);
        return false;
      }
      return true;
    });

    // detect screws that just landed — check for match
    for (const s of this.screws) {
      if (s.state === 'inSlot' && !s._matchChecked) {
        s._matchChecked = true;
        playSlot();
        const slot = this.tray.slots[s.slotIndex];
        // Only match when every reserved screw in this slot has actually landed
        const allLanded = slot && slot.screws.length >= this.tray.maxPerSlot
          && slot.screws.every(sc => sc.state === 'inSlot');
        if (allLanded) {
          const matched = this.tray.checkMatch(s.slotIndex);
          if (matched) {
            playMatch();
            const worldPos = this.tray.getSlotWorldPos(s.slotIndex, 1);
            this._burstParticles(worldPos, s.colorHex);
            for (const m of matched) m.startClear();
          }
        }
      }
    }

    // GC removed planks / cleared screws
    const planksBefore = this.planks.length;
    this.planks = this.planks.filter(p => {
      if (p.state === 'gone') {
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
        return false;
      }
      return true;
    });
    if (this.planks.length !== planksBefore) this._updateBlocking();

    // also re-check blocking when a plank starts falling
    for (const p of this.planks) {
      if (p.state === 'falling' && !p._unblocked) {
        p._unblocked = true;
        this._updateBlocking();
      }
    }

    this.screws = this.screws.filter(s => {
      if (s.state === 'cleared') {
        if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
        return false;
      }
      return true;
    });

    if (this.state !== 'playing') return;

    // Win: all attached screws gone, all in-flight resolved, all planks falling/gone
    const noAttachedScrews = this.attachedScrews().length === 0;
    const allInFlightDone = this.screws.every(s =>
      s.state === 'inSlot' || s.state === 'cleared' || s.state === 'clearing');
    const noAttachedPlanks = this.planks.every(p => p.state !== 'attached');
    if (noAttachedScrews && allInFlightDone && noAttachedPlanks && this.screws.length === 0) {
      this.state = 'won';
      playWin();
      this._emit();
      return;
    }

    // Lose: all 3 slots occupied AND no remaining attached screw can fit
    if (this.tray.isAllOccupied()) {
      const slotColors = new Set(this.tray.slots.filter(Boolean).map(s => s.color));
      const anyMatchable = this.attachedScrews().some(s => slotColors.has(s.color));
      // Also check if any slot has room left for new screw of that color
      const anyHasRoom = this.tray.slots.some(s => s && s.screws.length < this.tray.maxPerSlot && this.attachedScrews().some(sc => sc.color === s.color));
      if (!anyMatchable || !anyHasRoom) {
        this.state = 'lost';
        playLose();
        this._emit();
      }
    }
  }

  _emit() {
    if (this.onStateChange) this.onStateChange(this.state);
  }
}
