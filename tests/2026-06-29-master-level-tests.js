import { CollectorState } from '../src/2026-06-28-collector-state.js';
import { validateLevel } from '../src/2026-06-28-level-validator.js';
import {
  TWIN_BRIDGE_MANOR_LEVEL,
  CROSS_CORRIDOR_WORKSHOP_LEVEL,
  MIDNIGHT_DOUBLE_FORTRESS_LEVEL,
} from '../src/2026-06-29-master-levels.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function solveWithDeadlockChecks(level) {
  const collector = new CollectorState(level.rules);
  collector.loadLevel(level.binQueue);
  const state = new Map(level.pieces.map(part => [part.id, {
    part,
    removed: new Array(part.screws.length).fill(false),
  }]));
  const detached = new Set();

  function isUnlocked(part) {
    return (part.blockedBy ?? []).every(id => detached.has(id));
  }

  function accessibleColors() {
    const colors = new Set();
    for (const entry of state.values()) {
      if (detached.has(entry.part.id) || !isUnlocked(entry.part)) continue;
      entry.part.screws.forEach((item, index) => {
        if (!entry.removed[index]) colors.add(item.color);
      });
    }
    return colors;
  }

  level.authoredSolution.forEach((step, turn) => {
    const colors = accessibleColors();
    assert(colors.size > 0, `${level.name}: no accessible screw at turn ${turn + 1}`);
    assert(!collector.isStuck(colors), `${level.name}: forced collector deadlock at turn ${turn + 1}`);

    const entry = state.get(step.pieceId);
    assert(entry && isUnlocked(entry.part), `${level.name}: ${step.pieceId} is structurally locked at turn ${turn + 1}`);
    const item = entry.part.screws[step.screwIndex];
    assert(item?.color === step.color, `${level.name}: authored screw mismatch at turn ${turn + 1}`);
    assert(!entry.removed[step.screwIndex], `${level.name}: duplicate screw at turn ${turn + 1}`);

    const accepted = collector.acceptScrew(item.color, `${step.pieceId}:${step.screwIndex}`);
    assert(accepted, `${level.name}: basket rejected authored turn ${turn + 1}`);
    entry.removed[step.screwIndex] = true;
    if (entry.removed.every(Boolean)) detached.add(step.pieceId);
    collector.resolveCascade();
  });

  assert(detached.size === level.pieces.length, `${level.name}: floating parts remain after solution`);
  assert(collector.isCleared(), `${level.name}: baskets did not clear`);
}

function verifySupportLayers(level, expectedDepth) {
  const byId = new Map(level.pieces.map(part => [part.id, part]));
  const layers = new Set(level.pieces.map(part => part.structuralLayer));
  assert(Math.max(...layers) === expectedDepth, `${level.name}: expected ${expectedDepth} support layers`);

  for (const part of level.pieces) {
    if (part.structuralLayer === 1) {
      assert((part.blockedBy ?? []).length === 0, `${level.name}: top part ${part.id} should start unlocked`);
      continue;
    }
    assert((part.blockedBy ?? []).length > 0, `${level.name}: ${part.id} has no supporting dependency`);
    for (const blockerId of part.blockedBy) {
      const blocker = byId.get(blockerId);
      assert(blocker, `${level.name}: ${part.id} references missing support ${blockerId}`);
      assert(
        blocker.structuralLayer < part.structuralLayer,
        `${level.name}: ${part.id} can outlive a lower/equal support ${blockerId}`,
      );
    }
  }
}

function verifyMixedColors(level) {
  for (const part of level.pieces) {
    const layerSize = level.pieces.filter(item => item.structuralLayer === part.structuralLayer).length;
    if (layerSize < 4) continue;
    const colors = new Set(part.screws.map(item => item.color));
    assert(colors.size >= 2, `${level.name}: ${part.id} is a single-color giveaway`);
  }
}

const cases = [
  [TWIN_BRIDGE_MANOR_LEVEL, 96, 6, 3, 'MASTER I'],
  [CROSS_CORRIDOR_WORKSHOP_LEVEL, 108, 7, 3, 'MASTER II'],
  [MIDNIGHT_DOUBLE_FORTRESS_LEVEL, 120, 8, 2, 'FINAL'],
];

for (const [level, screwCount, depth, bufferCapacity, rank] of cases) {
  const validation = validateLevel(level);
  assert(validation.ok, `${level.name}: ${validation.errors.join('; ')}`);
  assert(level.pieces.length * 3 === screwCount, `${level.name}: screw count mismatch`);
  assert(level.binQueue.length * 3 === screwCount, `${level.name}: basket capacity mismatch`);
  assert(level.authoredSolution.length === screwCount, `${level.name}: solution length mismatch`);
  assert(level.rules.activeBoxCount === 2, `${level.name}: must use two active baskets`);
  assert(level.rules.bufferCapacity === bufferCapacity, `${level.name}: buffer mismatch`);
  assert(level.rank === rank, `${level.name}: rank mismatch`);
  assert(level.hints.length >= 3, `${level.name}: needs three progressive hints`);
  verifySupportLayers(level, depth);
  verifyMixedColors(level);
  solveWithDeadlockChecks(level);
  console.log(`[PASS] ${level.name}: ${screwCount} screws / ${depth} layers / buffer ${bufferCapacity}`);
}
