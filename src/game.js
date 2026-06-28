import * as THREE from 'three';
import { Screw, Plank, SlotTray } from './objects.js';
import { LEVELS } from './levels.js';
import {
  CollectorState, TARGET_BOX, TARGET_BUFFER,
} from './2026-06-28-collector-state.js';
import { validateLevel } from './2026-06-28-level-validator.js';
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
    // Tray sits in screen space as a camera child. Initial position is
    // a safe default; main.js's updateTrayForViewport() recalculates it
    // for the actual viewport (and on every resize).
    camera.add(this.tray.group);
    this.tray.group.position.set(0, 0.85, -3.6);
    this.tray.group.scale.set(0.75, 0.75, 0.75);

    // Pure rules engine: 2 active color-locked bins + 5 buffer slots + queue.
    this.collector = new CollectorState({
      activeBoxCount: 2,
      boxCapacity: 3,
      bufferCapacity: 5,
    });

    this.planks = [];
    this.screws = [];
    this.levelIdx = 0;
    this.state = 'playing';
    this.totalScrews = 0;
    this.onStateChange = null;
    this.onCountChange = null;

    this._particles = [];
    this._pendingCascade = false;
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
    this._pendingCascade = false;

    this.levelIdx = ((idx % LEVELS.length) + LEVELS.length) % LEVELS.length;
    this.state = 'playing';

    const level = LEVELS[this.levelIdx];

    // Static check: catch malformed levels (color counts, queue/screw
    // mismatch) before they reach the player. Logs to console but never
    // blocks — Stage 6 polish surface, not a runtime guard.
    const validation = validateLevel(level);
    if (validation.errors.length) {
      console.warn(
        `[Level ${this.levelIdx + 1}] validation errors:`,
        validation.errors,
      );
    }
    if (validation.warnings.length) {
      console.info(
        `[Level ${this.levelIdx + 1}] validation warnings:`,
        validation.warnings,
      );
    }

    const pieces = Array.isArray(level) ? level : level.pieces;
    const binQueue = Array.isArray(level) ? [] : (level.binQueue ?? []);
    this.collector.loadLevel(binQueue);
    this.tray.syncFromCollector(this.collector);

    for (const ps of pieces) {
      const plank = new Plank(ps);
      this.scene.add(plank.mesh);
      this.planks.push(plank);

      for (const ss of (ps.screws ?? [])) {
        const worldPos = plank.mesh.localToWorld(ss.localPos.clone());
        const worldNormal = ss.normal.clone().applyQuaternion(plank.mesh.quaternion).normalize();
        const screw = new Screw(ss.color, worldPos, worldNormal);
        this.scene.add(screw.mesh);
        plank.addScrew(screw);
        this.screws.push(screw);
      }
    }

    this.totalScrews = this.screws.length;
    this._updateBlocking();
    this._emit();
    this._emitCount();
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
      const origin = screw.mesh.position.clone().addScaledVector(screw.normal, 0.04);
      _ray.set(origin, screw.normal);
      _ray.far = 2.5;
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

    // Ask the rules engine where this color can go.
    const result = this.collector.acceptScrew(screw.color, screw.id);
    if (!result) {
      // Color doesn't match either active box AND buffer is full → reject.
      playBlocked();
      this._shake(screw);
      return;
    }

    // Build the flight target. Boxes get a stackIndex (0..2); buffers
    // identify by slotIndex.
    const target = result.target === TARGET_BOX
      ? { type: 'box',    boxIndex: result.boxIndex,  stackIndex: result.stackIndex }
      : { type: 'buffer', slotIndex: result.slotIndex };

    playUnscrew();
    screw.startUnscrew(this.tray, target);
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

  // Look up a Screw by its stable id (used when consuming cascade events).
  _findScrewById(id) {
    for (const s of this.screws) if (s.id === id) return s;
    return null;
  }

  // Translate a CollectorState cascade event into the renderer.
  _processCascadeEvents(events) {
    if (!events?.length) return;
    let anyMatch = false;
    for (const e of events) {
      if (e.type === 'box-complete') {
        anyMatch = true;
        for (const id of e.screwIds) {
          const s = this._findScrewById(id);
          if (s) s.startClear();
        }
        // burst at the cleared box's location
        const worldPos = this.tray.getTargetWorldPos({
          type: 'box', boxIndex: e.boxIndex, stackIndex: 1,
        });
        const colorHex = this._colorHexForName(e.color);
        this._burstParticles(worldPos, colorHex);
      } else if (e.type === 'box-slide-in') {
        // visual handled by syncFromCollector at the end
      } else if (e.type === 'auto-transfer') {
        // The screw was sitting in a buffer slot. Animate a smooth arc to
        // the destination box. The cascade gate in update() waits on these
        // to finish before resolving the next step, so chained completions
        // never tear down a screw mid-flight.
        const s = this._findScrewById(e.screwId);
        if (s) {
          s.startAutoTransfer({
            type: 'box', boxIndex: e.boxIndex, stackIndex: e.stackIndex,
          });
        }
      }
    }
    if (anyMatch) playMatch();
    this.tray.syncFromCollector(this.collector);
  }

  _colorHexForName(name) {
    const s = this.screws.find(sc => sc.color === name);
    return s ? s.colorHex : 0xffffff;
  }

  update(dt) {
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

    // Mark cascade pending whenever a screw first reaches its destination.
    for (const s of this.screws) {
      if (s.state === 'inSlot' && !s._landedHandled) {
        s._landedHandled = true;
        playSlot();
        this._pendingCascade = true;
      }
    }

    // Cascade gate: resolve ONE round at a time, waiting between rounds
    // for every animation (flight + auto-transfer) to settle. This keeps
    // chained completions visually coherent — a box never tears down a
    // screw that hasn't finished its arc.
    if (this._pendingCascade) {
      const stillAnimating = this.screws.some(s =>
        s.state === 'spinning' ||
        s.state === 'flying' ||
        s.state === 'autoTransferring');
      if (!stillAnimating) {
        const events = this.collector.resolveCascadeStep();
        if (events.length === 0) {
          this._pendingCascade = false;
        } else {
          this._processCascadeEvents(events);
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

    if (this._lastEmittedCount !== this.attachedScrews().length) {
      this._emitCount();
    }

    if (this.state !== 'playing') return;

    // Win: every screw is gone from the board, no flight pending,
    // collector reports cleared (no leftover in boxes/buffer/queue).
    const noAttached = this.attachedScrews().length === 0;
    const noFlying = this.screws.every(s =>
      s.state !== 'spinning' && s.state !== 'flying');
    if (noAttached && noFlying && this.collector.isCleared() && this.totalScrews > 0) {
      this.state = 'won';
      playWin();
      for (const p of this.planks) {
        if (p.state === 'attached') p.startFall();
      }
      this._emit();
      return;
    }

    // Lose: buffer is full AND no accessible screw can be placed.
    // We pass the set of unblocked colors so the engine can decide.
    const accessible = this.attachedScrews().filter(s => !s.blocked);
    const accessibleColors = new Set(accessible.map(s => s.color));
    if (this.collector.isStuck(accessibleColors)) {
      this.state = 'lost';
      playLose();
      this._emit();
    }
  }

  _emit() {
    if (this.onStateChange) this.onStateChange(this.state);
  }

  _emitCount() {
    this._lastEmittedCount = this.attachedScrews().length;
    if (this.onCountChange) {
      this.onCountChange(this._lastEmittedCount, this.totalScrews);
    }
  }
}
