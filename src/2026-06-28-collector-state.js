// Pure rules engine for the Screwdom-style puzzle.
//
// Independent of Three.js, the DOM, audio, and animations. The Game class
// owns one instance and asks it questions; the engine never reaches outward.
//
// Concepts:
//   - activeBoxes: up to N color-locked bins. Each accepts only its color
//     and holds up to `boxCapacity` screws. When full, the bin clears and
//     the next color from boxQueue slides in.
//   - buffer:     M temporary slots. ANY color can park here while waiting
//     for its color's box to become active. Each slot holds one screw.
//   - When a box's color matches a buffered screw, the buffered screw is
//     auto-transferred to the box. Auto-transfers can cascade.
//
// Public surface:
//   loadLevel(boxQueue)
//   acceptScrew(color, screwId) -> {target, ...} | null
//   resolveCascade()            -> events[]
//   isCleared()
//   isStuck(accessibleColors)
//   snapshot()

export const TARGET_BOX    = 'box';
export const TARGET_BUFFER = 'buffer';

export class CollectorState {
  constructor(opts = {}) {
    this.activeBoxCount = opts.activeBoxCount ?? 2;
    this.boxCapacity    = opts.boxCapacity    ?? 3;
    this.bufferCapacity = opts.bufferCapacity ?? 5;

    this.activeBoxes = [];   // each: { color, screwIds[] } | null
    this.boxQueue    = [];   // upcoming colors
    this.buffer      = [];   // each slot: { color, screwId } | null
    this.reset();
  }

  // ---------- lifecycle ----------
  reset() {
    this.activeBoxes = new Array(this.activeBoxCount).fill(null);
    this.boxQueue    = [];
    this.buffer      = new Array(this.bufferCapacity).fill(null);
  }

  loadLevel(boxQueue) {
    this.reset();
    const q = Array.isArray(boxQueue) ? boxQueue.slice() : [];
    for (let i = 0; i < this.activeBoxCount; i++) {
      const c = q.shift();
      this.activeBoxes[i] = c ? { color: c, screwIds: [] } : null;
    }
    this.boxQueue = q;
  }

  // ---------- queries ----------
  findBoxForColor(color) {
    for (let i = 0; i < this.activeBoxes.length; i++) {
      const b = this.activeBoxes[i];
      if (b && b.color === color && b.screwIds.length < this.boxCapacity) return i;
    }
    return -1;
  }

  findEmptyBufferSlot() {
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] === null) return i;
    }
    return -1;
  }

  isBufferFull() {
    return this.buffer.every(s => s !== null);
  }

  canAcceptScrew(color) {
    return this.findBoxForColor(color) >= 0 || this.findEmptyBufferSlot() >= 0;
  }

  isCleared() {
    const boxesEmpty = this.activeBoxes.every(b => b === null || b.screwIds.length === 0);
    const bufferEmpty = this.buffer.every(s => s === null);
    return boxesEmpty && bufferEmpty && this.boxQueue.length === 0;
  }

  /**
   * Given the set of colors currently visible/unblocked on the board,
   * return true if the game is stuck:
   *   - buffer is full
   *   - no accessible screw color matches an active box
   * The engine alone can't see the board, so the caller passes the list.
   */
  isStuck(accessibleColors) {
    if (!this.isBufferFull()) return false;
    const colors = accessibleColors instanceof Set
      ? accessibleColors
      : new Set(accessibleColors ?? []);
    for (const c of colors) {
      if (this.findBoxForColor(c) >= 0) return false;
    }
    return true;
  }

  // ---------- commands ----------
  /**
   * Accept a screw of the given color. Returns the target slot or null if
   * the screw cannot be placed anywhere (color doesn't match a box AND
   * buffer is full). When null is returned the engine state is unchanged.
   */
  acceptScrew(color, screwId) {
    // 1. Prefer an active box of the same color with capacity left.
    const boxIdx = this.findBoxForColor(color);
    if (boxIdx >= 0) {
      const box = this.activeBoxes[boxIdx];
      box.screwIds.push(screwId);
      return {
        target: TARGET_BOX,
        boxIndex: boxIdx,
        stackIndex: box.screwIds.length - 1,
        color,
      };
    }
    // 2. Otherwise drop into the first empty buffer slot.
    const slotIdx = this.findEmptyBufferSlot();
    if (slotIdx >= 0) {
      this.buffer[slotIdx] = { color, screwId };
      return {
        target: TARGET_BUFFER,
        slotIndex: slotIdx,
        color,
      };
    }
    // 3. Nowhere to go.
    return null;
  }

  /**
   * Run ONE round of cascade resolution: first any full box → clear + slide,
   * then any buffered screw whose color now matches an active box →
   * auto-transfer. Returns the events for this single round (possibly empty
   * if the state is stable).
   *
   * Renderer-friendly: the caller animates the returned events, waits for
   * the animations to settle, then calls again. This prevents a chained
   * cascade from clobbering a screw that hasn't finished flying yet.
   */
  resolveCascadeStep() {
    const events = [];
    let changed = false;

    // (a) Box completions.
    for (let i = 0; i < this.activeBoxes.length; i++) {
      const b = this.activeBoxes[i];
      if (b && b.screwIds.length >= this.boxCapacity) {
        events.push({
          type: 'box-complete',
          boxIndex: i,
          color: b.color,
          screwIds: b.screwIds.slice(),
        });
        const next = this.boxQueue.shift();
        this.activeBoxes[i] = next ? { color: next, screwIds: [] } : null;
        if (next) {
          events.push({ type: 'box-slide-in', boxIndex: i, color: next });
        }
        changed = true;
      }
    }

    // (b) Buffer auto-transfers.
    for (let s = 0; s < this.buffer.length; s++) {
      const entry = this.buffer[s];
      if (!entry) continue;
      const boxIdx = this.findBoxForColor(entry.color);
      if (boxIdx >= 0) {
        const box = this.activeBoxes[boxIdx];
        box.screwIds.push(entry.screwId);
        events.push({
          type: 'auto-transfer',
          slotIndex: s,
          boxIndex: boxIdx,
          color: entry.color,
          screwId: entry.screwId,
          stackIndex: box.screwIds.length - 1,
        });
        this.buffer[s] = null;
        changed = true;
      }
    }

    return events;
  }

  /**
   * Run cascade resolution to completion in one call. Kept for the rules
   * tests and offline simulation; the live renderer should use
   * resolveCascadeStep so it can pace each round to its animations.
   */
  resolveCascade() {
    const all = [];
    let guard = 0;
    while (guard++ < 1000) {
      const round = this.resolveCascadeStep();
      if (round.length === 0) break;
      all.push(...round);
    }
    return all;
  }

  // ---------- diagnostics ----------
  snapshot() {
    return {
      activeBoxes: this.activeBoxes.map(b => b
        ? { color: b.color, count: b.screwIds.length, capacity: this.boxCapacity }
        : null),
      buffer: this.buffer.map(s => s ? { color: s.color, screwId: s.screwId } : null),
      queue: this.boxQueue.slice(),
    };
  }
}
