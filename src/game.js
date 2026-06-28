import * as THREE from 'three';
import { Screw, Plank } from './objects.js';
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
  constructor(scene, camera, view, viewProj) {
    this.scene = scene;
    this.camera = camera;
    // view  = DOM BinView (boxes + buffer + head tokens)
    // viewProj.getTargetWorldPos(target) → THREE.Vector3 in perspective
    //   world space, derived from the DOM bin's pixel position.
    this.view = view;
    this.viewProj = viewProj;

    // Pure rules engine.
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
    this._cascadeBusyUntil = 0;
    this._timers = new Set();   // tracked setTimeout ids for cancel-on-restart
  }

  // ---------- timer helpers (canceled on loadLevel) ----------
  _setTimer(fn, ms) {
    const id = setTimeout(() => {
      this._timers.delete(id);
      fn();
    }, ms);
    this._timers.add(id);
    return id;
  }
  _clearTimers() {
    for (const id of this._timers) clearTimeout(id);
    this._timers.clear();
  }

  loadLevel(idx) {
    // wipe previous level entities + DOM tokens + scheduled callbacks
    this._clearTimers();
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
    this.view.reset();
    this._pendingCascade = false;
    this._cascadeBusyUntil = 0;

    this.levelIdx = ((idx % LEVELS.length) + LEVELS.length) % LEVELS.length;
    this.state = 'playing';

    const level = LEVELS[this.levelIdx];

    const validation = validateLevel(level);
    if (validation.errors.length) {
      console.warn(`[Level ${this.levelIdx + 1}] validation errors:`, validation.errors);
    }
    if (validation.warnings.length) {
      console.info(`[Level ${this.levelIdx + 1}] validation warnings:`, validation.warnings);
    }

    const pieces   = Array.isArray(level) ? level : level.pieces;
    const binQueue = Array.isArray(level) ? []    : (level.binQueue ?? []);
    this.collector.loadLevel(binQueue);
    this.view.syncFromCollector(this.collector);

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

  // Input only flows while no cascade is pending and no box has already
  // been reserved-full (would otherwise spill the next same-color tap).
  _isAcceptingInput() {
    if (this.state !== 'playing') return false;
    if (this._pendingCascade) return false;
    if (performance.now() < this._cascadeBusyUntil) return false;
    for (const b of this.collector.activeBoxes) {
      if (b && b.screwIds.length >= this.collector.boxCapacity) return false;
    }
    return true;
  }

  trySelectScrew(screw) {
    if (!this._isAcceptingInput()) return;
    if (screw.state !== 'attached') return;

    if (screw.blocked) {
      playBlocked();
      this._shake(screw);
      return;
    }

    const result = this.collector.acceptScrew(screw.color, screw.id);
    if (!result) {
      playBlocked();
      this._shake(screw);
      return;
    }

    const target = result.target === TARGET_BOX
      ? { type: 'box',    boxIndex: result.boxIndex,  stackIndex: result.stackIndex }
      : { type: 'buffer', slotIndex: result.slotIndex };

    playUnscrew();
    screw.startUnscrew(this.viewProj, target);
    screw.plank.removeScrew(screw);

    if (screw.plank.state === 'falling') {
      this._setTimer(() => playThud(), 280);
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
    const count = 14;
    const geo = new THREE.SphereGeometry(0.05, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(worldPos);
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.6 + 0.2,
        Math.random() - 0.5,
      ).normalize();
      const speed = 1.3 + Math.random() * 2.0;
      this.scene.add(m);
      this._particles.push({
        mesh: m,
        vel: dir.multiplyScalar(speed),
        life: 0,
        max: 0.55 + Math.random() * 0.3,
      });
    }
  }

  _findScrewById(id) {
    for (const s of this.screws) if (s.id === id) return s;
    return null;
  }

  // Translate CollectorState cascade events into BinView calls.
  _processCascadeEvents(events) {
    if (!events?.length) return;
    let anyMatch = false;

    // Boxes that animated in this batch — their rect is mid-animation, so
    // any auto-transfer landing in one of them must wait for the slide-in
    // to settle before sampling the bin's screen position.
    const slidInBoxes = new Set();
    for (const e of events) {
      if (e.type === 'box-slide-in') slidInBoxes.add(e.boxIndex);
    }

    for (const e of events) {
      if (e.type === 'box-complete') {
        anyMatch = true;
        for (const id of e.screwIds) {
          this.view.removeToken(id);
          const s = this._findScrewById(id);
          if (s) {
            this._setTimer(() => { s.state = 'gone'; }, 340);
          }
        }
      } else if (e.type === 'box-slide-in') {
        this.view.slideInBox(e.boxIndex, e.color);
      } else if (e.type === 'auto-transfer') {
        const s = this._findScrewById(e.screwId);
        if (s) {
          s.target = { type: 'box', boxIndex: e.boxIndex, stackIndex: e.stackIndex };
          if (slidInBoxes.has(e.boxIndex)) {
            // Delay so the destination box's slide-in finishes and its
            // getBoundingClientRect returns the settled position.
            this._setTimer(() => {
              this.view.moveTokenToTarget(e.screwId, s.target);
            }, 320);
          } else {
            this.view.moveTokenToTarget(e.screwId, s.target);
          }
        }
      }
    }
    if (anyMatch) playMatch();
    this.view.syncFromCollector(this.collector);
    // Pace the next cascade step. If we deferred any token movement, the
    // gate has to wait at least slide-in + token transition.
    const dur = slidInBoxes.size > 0 ? 700 : 360;
    this._cascadeBusyUntil = performance.now() + dur;
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

    // landed → swap 3D mesh for a DOM head token
    for (const s of this.screws) {
      if (s.state === 'landed' && !s._handedOff) {
        s._handedOff = true;
        playSlot();
        this.view.createHeadToken(s.id, s.color, s.target);
        if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
        s.state = 'inBin';
        this._pendingCascade = true;
      }
    }

    // Resolve one cascade step at a time, but only after every screw in
    // flight has actually arrived AND the previous DOM animation has had
    // time to play out.
    if (this._pendingCascade && performance.now() >= this._cascadeBusyUntil) {
      const stillFlying = this.screws.some(s =>
        s.state === 'spinning' || s.state === 'flying');
      if (!stillFlying) {
        const events = this.collector.resolveCascadeStep();
        if (events.length === 0) {
          this._pendingCascade = false;
        } else {
          this._processCascadeEvents(events);
        }
      }
    }

    // GC removed planks / gone screws
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

    this.screws = this.screws.filter(s => s.state !== 'gone');

    if (this._lastEmittedCount !== this.attachedScrews().length) {
      this._emitCount();
    }

    if (this.state !== 'playing') return;

    // Stable = no in-flight 3D, no pending cascade, all DOM animations done
    const noTransient = this.screws.every(s =>
      s.state !== 'spinning' && s.state !== 'flying' && s.state !== 'landed');
    const stable = noTransient && !this._pendingCascade
      && performance.now() >= this._cascadeBusyUntil;

    if (stable
        && this.attachedScrews().length === 0
        && this.collector.isCleared()
        && this.totalScrews > 0) {
      this.state = 'won';
      playWin();
      for (const p of this.planks) {
        if (p.state === 'attached') p.startFall();
      }
      this._emit();
      return;
    }

    // Rule A: buffer 5/5 once the cascade has settled = immediate loss.
    if (stable && this.collector.isBufferFull()) {
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
