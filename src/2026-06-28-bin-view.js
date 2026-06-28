// DOM/SVG view layer for the collection bins.
//
// Replaces the 3D SlotTray entirely. Two colour-locked boxes (each with
// three hole slots arranged as a triangle) sit on the top of the screen,
// with a row of five round buffer slots underneath. When a screw lands,
// the 3D mesh is destroyed and a small DOM "head token" takes its place;
// auto-transfer is just a CSS transition between two screen coordinates.
//
// The view exposes:
//   getTargetScreenPos(target)         — pixel coords for any slot
//   syncFromCollector(state)            — repaint box colours / buffer dots
//   createHeadToken(id, color, target)  — token at landing
//   moveTokenToTarget(id, target)       — animated reposition (auto-transfer)
//   removeToken(id)                     — pop animation then DOM remove
//   slideInBox(boxIndex, color)         — slide-down animation for new bin
//   reset()                             — clear all tokens (level restart)

const SCREW_HEX = {
  red:    '#ff5252',
  blue:   '#3a8ee0',
  green:  '#55cf65',
  yellow: '#ffd542',
  orange: '#ff9543',
  pink:   '#ff8ec7',
  purple: '#a75fdd',
  cyan:   '#3ee0d0',
  brown:  '#9a5d2d',
  white:  '#eff2f5',
};

const ACTIVE_BOX_COUNT = 2;
const BOX_CAPACITY     = 3;
const BUFFER_COUNT     = 5;

export class BinView {
  constructor(rootEl) {
    this.root = rootEl;
    this.boxes  = [];                 // DOM elements
    this.holes  = [];                 // [boxIndex][stackIndex] DOM elements
    this.buffers = [];                // DOM elements
    this.tokens  = new Map();         // screwId → token DOM
    this._build();
  }

  _build() {
    this.root.innerHTML = '';
    this.root.classList.add('bin-view');

    // top row: two color-locked boxes, each with 3 hole indicators
    const boxRow = document.createElement('div');
    boxRow.className = 'bv-boxes';
    for (let i = 0; i < ACTIVE_BOX_COUNT; i++) {
      const box = document.createElement('div');
      box.className = 'bv-box bv-box--empty';
      box.dataset.boxIndex = String(i);
      box.style.setProperty('--bv-color', '#c8b89a');

      const holesWrap = document.createElement('div');
      holesWrap.className = 'bv-holes';
      const myHoles = [];
      for (let j = 0; j < BOX_CAPACITY; j++) {
        const hole = document.createElement('div');
        hole.className = 'bv-hole';
        hole.dataset.stackIndex = String(j);
        holesWrap.appendChild(hole);
        myHoles.push(hole);
      }
      box.appendChild(holesWrap);
      boxRow.appendChild(box);
      this.boxes.push(box);
      this.holes.push(myHoles);
    }

    // bottom row: 5 round buffer slots
    const bufferRow = document.createElement('div');
    bufferRow.className = 'bv-buffers';
    for (let i = 0; i < BUFFER_COUNT; i++) {
      const slot = document.createElement('div');
      slot.className = 'bv-buffer';
      slot.dataset.slotIndex = String(i);
      bufferRow.appendChild(slot);
      this.buffers.push(slot);
    }

    this.root.appendChild(boxRow);
    this.root.appendChild(bufferRow);

    // Tokens float inside a fixed-position layer so their absolute
    // pixel coordinates work regardless of any ancestor transforms.
    this.tokenLayer = document.createElement('div');
    this.tokenLayer.className = 'bv-token-layer';
    document.body.appendChild(this.tokenLayer);
  }

  // ---------- queries ----------
  getBoxHoleScreenPos(boxIndex, stackIndex) {
    const hole = this.holes[boxIndex]?.[stackIndex];
    if (!hole) return null;
    const r = hole.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  getBufferScreenPos(slotIndex) {
    const slot = this.buffers[slotIndex];
    if (!slot) return null;
    const r = slot.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  getTargetScreenPos(target) {
    if (!target) return null;
    if (target.type === 'box') {
      return this.getBoxHoleScreenPos(target.boxIndex, target.stackIndex);
    }
    return this.getBufferScreenPos(target.slotIndex);
  }

  // ---------- state sync ----------
  syncFromCollector(collector) {
    // Box frame colour follows the active box's screw colour.
    for (let i = 0; i < ACTIVE_BOX_COUNT; i++) {
      const b = collector.activeBoxes?.[i];
      const box = this.boxes[i];
      if (!box) continue;
      if (b) {
        const hex = SCREW_HEX[b.color] ?? '#c8b89a';
        box.style.setProperty('--bv-color', hex);
        box.classList.remove('bv-box--empty');
      } else {
        box.style.setProperty('--bv-color', '#c8b89a');
        box.classList.add('bv-box--empty');
      }
    }
    // Buffer slot tints stay neutral; tokens carry the colour.
    for (let i = 0; i < BUFFER_COUNT; i++) {
      const entry = collector.buffer?.[i];
      const slot = this.buffers[i];
      if (!slot) continue;
      slot.classList.toggle('bv-buffer--filled', !!entry);
    }
  }

  // ---------- tokens ----------
  createHeadToken(screwId, color, target) {
    const pos = this.getTargetScreenPos(target);
    if (!pos) return;
    const token = document.createElement('div');
    token.className = 'bv-token';
    token.style.background = SCREW_HEX[color] ?? '#cccccc';
    // Position via top/left in pixel space — token layer is fixed-position
    // so these are screen-relative regardless of scroll.
    token.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
    this.tokenLayer.appendChild(token);
    this.tokens.set(screwId, token);
    // Small pop-in
    requestAnimationFrame(() => token.classList.add('bv-token--in'));
  }

  moveTokenToTarget(screwId, target) {
    const token = this.tokens.get(screwId);
    if (!token) return;
    const pos = this.getTargetScreenPos(target);
    if (!pos) return;
    token.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
  }

  removeToken(screwId) {
    const token = this.tokens.get(screwId);
    if (!token) return;
    token.classList.add('bv-token--out');
    const t = setTimeout(() => {
      token.remove();
      this.tokens.delete(screwId);
    }, 320);
    token.dataset.cleanupTimer = String(t);
  }

  // Reposition every existing token (call on window resize / camera fit)
  reflowTokens(getTargetForId) {
    for (const [id, token] of this.tokens) {
      const target = getTargetForId(id);
      if (!target) continue;
      const pos = this.getTargetScreenPos(target);
      if (!pos) continue;
      token.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
    }
  }

  // ---------- box transitions ----------
  slideInBox(boxIndex, color) {
    const box = this.boxes[boxIndex];
    if (!box) return;
    box.classList.remove('bv-box--empty');
    box.style.setProperty('--bv-color', SCREW_HEX[color] ?? '#c8b89a');
    box.classList.remove('bv-box--slide');
    // Force reflow so the animation restarts
    void box.offsetWidth;
    box.classList.add('bv-box--slide');
  }

  popBox(boxIndex) {
    const box = this.boxes[boxIndex];
    if (!box) return;
    box.classList.remove('bv-box--pop');
    void box.offsetWidth;
    box.classList.add('bv-box--pop');
  }

  // ---------- lifecycle ----------
  reset() {
    for (const [, t] of this.tokens) t.remove();
    this.tokens.clear();
    for (const box of this.boxes) {
      box.classList.add('bv-box--empty');
      box.style.setProperty('--bv-color', '#c8b89a');
    }
    for (const slot of this.buffers) {
      slot.classList.remove('bv-buffer--filled');
    }
  }
}
