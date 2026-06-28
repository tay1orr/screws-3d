// Screen-space collector UI. Gameplay state remains in CollectorState;
// this class renders boxes, buffer slots and screw-head tokens.

const SCREW_HEX = {
  red: '#ff5252', blue: '#3a8ee0', green: '#55cf65', yellow: '#ffd542',
  orange: '#ff9543', pink: '#ff8ec7', purple: '#a75fdd', cyan: '#3ee0d0',
  brown: '#9a5d2d', white: '#eff2f5',
};

const ACTIVE_BOX_COUNT = 2;
const BOX_CAPACITY = 3;
const BUFFER_COUNT = 5;

export class BinView {
  constructor(rootEl) {
    this.root = rootEl;
    this.boxes = [];
    this.holes = [];
    this.buffers = [];
    this.tokens = new Map();
    this._timers = new Set();
    this._rafs = new Set();
    this._build();
  }

  _build() {
    this.root.innerHTML = '';
    this.root.classList.add('bin-view');
    const boxRow = document.createElement('div');
    boxRow.className = 'bv-boxes';
    for (let i = 0; i < ACTIVE_BOX_COUNT; i++) {
      const box = document.createElement('div');
      box.className = 'bv-box bv-box--empty';
      box.dataset.boxIndex = String(i);
      box.dataset.testid = `collector-box-${i}`;
      box.style.setProperty('--bv-color', '#c8b89a');
      const holesWrap = document.createElement('div');
      holesWrap.className = 'bv-holes';
      const boxHoles = [];
      for (let j = 0; j < BOX_CAPACITY; j++) {
        const hole = document.createElement('div');
        hole.className = 'bv-hole';
        hole.dataset.stackIndex = String(j);
        hole.dataset.testid = `collector-box-${i}-hole-${j}`;
        holesWrap.appendChild(hole);
        boxHoles.push(hole);
      }
      box.appendChild(holesWrap);
      boxRow.appendChild(box);
      this.boxes.push(box);
      this.holes.push(boxHoles);
    }
    const bufferRow = document.createElement('div');
    bufferRow.className = 'bv-buffers';
    for (let i = 0; i < BUFFER_COUNT; i++) {
      const slot = document.createElement('div');
      slot.className = 'bv-buffer';
      slot.dataset.slotIndex = String(i);
      slot.dataset.testid = `collector-buffer-${i}`;
      bufferRow.appendChild(slot);
      this.buffers.push(slot);
    }
    this.root.append(boxRow, bufferRow);
    this.tokenLayer = document.createElement('div');
    this.tokenLayer.className = 'bv-token-layer';
    document.body.appendChild(this.tokenLayer);
  }

  getBoxHoleScreenPos(boxIndex, stackIndex) {
    const hole = this.holes[boxIndex]?.[stackIndex];
    if (!hole) return null;
    const rect = hole.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  getBufferScreenPos(slotIndex) {
    const slot = this.buffers[slotIndex];
    if (!slot) return null;
    const rect = slot.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  getTargetScreenPos(target) {
    if (!target) return null;
    return target.type === 'box'
      ? this.getBoxHoleScreenPos(target.boxIndex, target.stackIndex)
      : this.getBufferScreenPos(target.slotIndex);
  }

  syncBoxesFromCollector(collector) {
    for (let i = 0; i < ACTIVE_BOX_COUNT; i++) {
      const state = collector.activeBoxes?.[i];
      const box = this.boxes[i];
      if (state) {
        box.style.setProperty('--bv-color', SCREW_HEX[state.color] ?? '#c8b89a');
        box.classList.remove('bv-box--empty');
      } else {
        box.style.setProperty('--bv-color', '#c8b89a');
        box.classList.add('bv-box--empty');
      }
    }
  }

  syncBuffersFromCollector(collector) {
    for (let i = 0; i < BUFFER_COUNT; i++) {
      this.buffers[i]?.classList.toggle('bv-buffer--filled', !!collector.buffer?.[i]);
    }
  }

  syncFromCollector(collector) {
    this.syncBoxesFromCollector(collector);
    this.syncBuffersFromCollector(collector);
  }

  createHeadToken(screwId, color, target) {
    const pos = this.getTargetScreenPos(target);
    if (!pos) return;
    this.removeTokenImmediately(screwId);
    const token = document.createElement('div');
    token.className = 'bv-token';
    token.dataset.color = color;
    token.dataset.testid = `collector-token-${screwId}`;
    token.style.setProperty('--token-color', SCREW_HEX[color] ?? '#cccccc');
    token.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
    this.tokenLayer.appendChild(token);
    this.tokens.set(screwId, token);
    const raf = requestAnimationFrame(() => {
      this._rafs.delete(raf);
      if (token.isConnected) token.classList.add('bv-token--in');
    });
    this._rafs.add(raf);
  }

  moveTokenToTarget(screwId, target) {
    const token = this.tokens.get(screwId);
    const pos = this.getTargetScreenPos(target);
    if (!token || !pos) return;
    token.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
  }

  removeToken(screwId) {
    const token = this.tokens.get(screwId);
    if (!token) return;
    token.classList.add('bv-token--out');
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      if (this.tokens.get(screwId) === token) this.tokens.delete(screwId);
      token.remove();
    }, 320);
    this._timers.add(timer);
  }

  removeTokenImmediately(screwId) {
    const token = this.tokens.get(screwId);
    if (!token) return;
    token.remove();
    this.tokens.delete(screwId);
  }

  reflowTokens(getTargetForId) {
    for (const [id, token] of this.tokens) {
      const pos = this.getTargetScreenPos(getTargetForId(id));
      if (pos) token.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
    }
  }

  completeBox(boxIndex) {
    const box = this.boxes[boxIndex];
    if (!box) return;
    box.classList.remove('bv-box--slide', 'bv-box--complete');
    void box.offsetWidth;
    box.classList.add('bv-box--complete');
  }

  slideInBox(boxIndex, color) {
    const box = this.boxes[boxIndex];
    if (!box) return;
    box.classList.remove('bv-box--empty', 'bv-box--complete', 'bv-box--slide');
    box.style.setProperty('--bv-color', SCREW_HEX[color] ?? '#c8b89a');
    void box.offsetWidth;
    box.classList.add('bv-box--slide');
  }

  reset() {
    for (const timer of this._timers) clearTimeout(timer);
    for (const raf of this._rafs) cancelAnimationFrame(raf);
    this._timers.clear();
    this._rafs.clear();
    for (const token of this.tokens.values()) token.remove();
    this.tokens.clear();
    for (const box of this.boxes) {
      box.classList.remove('bv-box--slide', 'bv-box--complete');
      box.classList.add('bv-box--empty');
      box.style.setProperty('--bv-color', '#c8b89a');
    }
    for (const slot of this.buffers) slot.classList.remove('bv-buffer--filled');
  }

  destroy() {
    this.reset();
    this.tokenLayer?.remove();
  }
}
