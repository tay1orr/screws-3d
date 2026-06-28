import * as THREE from 'three';
import { Screw, Plank } from './objects.js';
import { LEVELS } from './levels.js';
import {
  CollectorState, TARGET_BOX, TARGET_BUFFER,
} from './2026-06-28-collector-state.js';
import { validateLevel } from './2026-06-28-level-validator.js';
import { hasAttachedPartDependency } from './2026-06-29-part-dependencies.js';
import {
  playClick, playUnscrew, playSlot, playMatch,
  playWin, playLose, playThud, playBlocked,
} from './audio.js';

const _ray = new THREE.Raycaster();

// Release the GPU resources owned by a mesh tree. Iterates children so
// composite groups (the Screw is one) are fully released too.
function _disposeMesh(root) {
  root.traverse((o) => {
    if (o.geometry && typeof o.geometry.dispose === 'function') {
      o.geometry.dispose();
    }
    const mat = o.material;
    if (!mat) return;
    if (Array.isArray(mat)) for (const m of mat) m.dispose?.();
    else mat.dispose?.();
  });
}

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
    this.paused = false;
    this.totalScrews = 0;
    this.onStateChange = null;
    this.onCountChange = null;

    this._particles = [];
    this._pendingCascade = false;
    this._cascadeBusyUntil = 0;
    this._timers = new Set();   // pausable timer records
    this._rafTokens = new Set(); // requestAnimationFrame handles for shake etc.

    // Pooled resources (Codex 7.1): share one SphereGeometry for every
    // particle, and one MeshBasicMaterial per color, so we don't churn the
    // GPU pipeline every box-complete.
    this._particleGeo = new THREE.SphereGeometry(0.05, 8, 6);
    this._particleMats = new Map();
  }

  _particleMaterial(colorHex) {
    let mat = this._particleMats.get(colorHex);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color: colorHex });
      this._particleMats.set(colorHex, mat);
    }
    return mat;
  }

  // ---------- timer helpers (canceled on loadLevel) ----------
  _setTimer(fn, ms) {
    const timer = { fn, remaining: ms, startedAt: 0, id: null };
    const schedule = () => {
      timer.startedAt = performance.now();
      timer.id = setTimeout(() => {
        this._timers.delete(timer);
        timer.id = null;
        timer.fn();
      }, timer.remaining);
    };
    timer.schedule = schedule;
    this._timers.add(timer);
    if (!this.paused) schedule();
    return timer;
  }
  _clearTimers() {
    for (const timer of this._timers) {
      if (timer.id !== null) clearTimeout(timer.id);
    }
    this._timers.clear();
  }

  setPaused(paused) {
    if (this.state !== 'playing' && paused) return;
    if (this.paused === paused) return;
    const now = performance.now();
    this.paused = paused;
    if (paused) {
      this._pausedAt = now;
      for (const timer of this._timers) {
        if (timer.id === null) continue;
        clearTimeout(timer.id);
        timer.id = null;
        timer.remaining = Math.max(0, timer.remaining - (now - timer.startedAt));
      }
    } else {
      const pauseDuration = now - (this._pausedAt ?? now);
      this._cascadeBusyUntil += pauseDuration;
      for (const timer of this._timers) {
        if (timer.id === null) timer.schedule();
      }
    }
  }

  loadLevel(idx) {
    // wipe previous level entities + DOM tokens + scheduled callbacks
    this._clearTimers();
    this._clearRafTokens();
    for (const p of this.planks) {
      if (p.mesh.parent) p.mesh.parent.remove(p.mesh);
      _disposeMesh(p.mesh);
    }
    for (const s of this.screws) {
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      _disposeMesh(s.mesh);
    }
    for (const sp of this._particles) {
      if (sp.mesh.parent) sp.mesh.parent.remove(sp.mesh);
      // particle geometry / material is pooled — don't dispose
    }
    this._particles = [];
    this.planks = [];
    this.screws = [];
    this.view.reset();
    this._pendingCascade = false;
    this._cascadeBusyUntil = 0;

    this.levelIdx = ((idx % LEVELS.length) + LEVELS.length) % LEVELS.length;
    this.state = 'playing';
    this.paused = false;

    const level = LEVELS[this.levelIdx];
    const rules = level.rules ?? {};

    this.collector = new CollectorState({
      activeBoxCount: rules.activeBoxCount ?? 2,
      boxCapacity: rules.boxCapacity ?? 3,
      bufferCapacity: rules.bufferCapacity ?? 5,
    });
    this.view.configure(rules);

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
        const localPos = ss.localPos?.isVector3
          ? ss.localPos.clone()
          : new THREE.Vector3().fromArray(ss.localPos);
        const localNormal = ss.normal?.isVector3
          ? ss.normal.clone()
          : new THREE.Vector3().fromArray(ss.normal);
        const worldPos = plank.mesh.localToWorld(localPos);
        const worldNormal = localNormal.applyQuaternion(plank.mesh.quaternion).normalize();
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

  currentLevel() {
    return LEVELS[this.levelIdx];
  }

  _updateBlocking() {
    const plankMeshes = this.planks
      .filter(p => p.state === 'attached')
      .map(p => p.mesh);

    for (const screw of this.screws) {
      if (screw.state !== 'attached') continue;
      let blocked = hasAttachedPartDependency(screw.plank, this.planks);

      // Structural dependencies take priority. Raycasts still handle pieces
      // that physically cover a screw but do not have an explicit hierarchy.
      if (blocked) {
        screw.setBlocked(true);
        continue;
      }
      const origin = screw.mesh.position.clone().addScaledVector(screw.normal, 0.04);
      _ray.set(origin, screw.normal);
      _ray.far = 2.5;
      const hits = _ray.intersectObjects(plankMeshes, false);
      for (const h of hits) {
        if (h.object !== screw.plank.mesh) { blocked = true; break; }
      }
      screw.setBlocked(blocked);
    }
  }

  // Logical collector reservations are synchronous, so animation work never
  // needs to freeze the whole board. A click is rejected only when gameplay
  // itself is unavailable; CollectorState decides whether a destination fits.
  _isAcceptingInput() {
    if (this.state !== 'playing') return false;
    return !this.paused;
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
      const id = requestAnimationFrame(() => {
        this._rafTokens.delete(id);
        tick();
      });
      this._rafTokens.add(id);
    };
    tick();
  }
  _clearRafTokens() {
    for (const id of this._rafTokens) cancelAnimationFrame(id);
    this._rafTokens.clear();
  }

  _burstParticles(worldPos, colorHex) {
    const count = 14;
    const mat = this._particleMaterial(colorHex);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this._particleGeo, mat);
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

    // A live box immediately takes the next color while a detached ghost of
    // the completed box exits above it. Input can continue during the swap.
    const slidInBoxes = new Set();
    for (const e of events) {
      if (e.type === 'box-slide-in') slidInBoxes.add(e.boxIndex);
    }

    for (const e of events) {
      if (e.type === 'box-complete') {
        anyMatch = true;
        this.view.completeBox(e.boxIndex);
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
            // The slot is already active; a short delay merely lets its
            // entrance motion settle before the buffered token joins it.
            this._setTimer(() => {
              this.view.moveTokenToTarget(e.screwId, s.target);
            }, 180);
          } else {
            this.view.moveTokenToTarget(e.screwId, s.target);
          }
        }
      }
    }
    if (anyMatch) playMatch();
    this.view.syncBuffersFromCollector(this.collector);
    this.view.syncBoxesFromCollector(this.collector);
    // This clock paces visual cascade rounds, but no longer gates input.
    const dur = slidInBoxes.size > 0 ? 420 : 240;
    this._cascadeBusyUntil = performance.now() + dur;
  }

  update(dt) {
    if (this.paused) return;
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
        this.view.syncBuffersFromCollector(this.collector);
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
          this.view.syncFromCollector(this.collector);
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
        _disposeMesh(p.mesh);
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
      if (s.state !== 'gone') return true;
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      _disposeMesh(s.mesh);
      return false;
    });

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

    // A full buffer is only a loss when no currently removable screw can go
    // directly to an active box. This keeps the last strategic move playable.
    const accessibleColors = new Set(this.screws
      .filter(s => s.state === 'attached' && !s.blocked)
      .map(s => s.color));
    if (stable && this.collector.isStuck(accessibleColors)) {
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
