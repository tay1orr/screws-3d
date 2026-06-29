import { CollectorState } from '../src/2026-06-28-collector-state.js';
import { validateLevel } from '../src/2026-06-28-level-validator.js';
import {
  L_SHAPED_MANOR_LEVEL,
  CROSS_TOWER_LEVEL,
  FINAL_INNER_FRAME_LEVEL,
} from '../src/2026-06-29-elite-levels.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifyAuthoredSolution(level) {
  const collector = new CollectorState(level.rules);
  collector.loadLevel(level.binQueue);

  const pieces = new Map(level.pieces.map(part => [part.id, {
    spec: part,
    removed: new Array(part.screws.length).fill(false),
  }]));
  const detached = new Set();

  level.authoredSolution.forEach((step, turn) => {
    const part = pieces.get(step.pieceId);
    assert(part, `${level.name}: solution turn ${turn + 1} references missing part ${step.pieceId}`);
    assert(!detached.has(step.pieceId), `${level.name}: turn ${turn + 1} selects a detached part`);
    for (const blocker of part.spec.blockedBy ?? []) {
      assert(detached.has(blocker), `${level.name}: turn ${turn + 1} selects ${step.pieceId} before ${blocker}`);
    }

    const item = part.spec.screws[step.screwIndex];
    assert(item, `${level.name}: invalid screw index ${step.screwIndex} on ${step.pieceId}`);
    assert(!part.removed[step.screwIndex], `${level.name}: duplicate screw selection on ${step.pieceId}`);
    assert(item.color === step.color, `${level.name}: authored color drift on ${step.pieceId}`);

    const accepted = collector.acceptScrew(item.color, `${step.pieceId}:${step.screwIndex}`);
    assert(accepted, `${level.name}: collector rejected turn ${turn + 1} (${item.color})`);
    part.removed[step.screwIndex] = true;
    if (part.removed.every(Boolean)) detached.add(step.pieceId);
    collector.resolveCascade();
  });

  assert(detached.size === level.pieces.length, `${level.name}: ${level.pieces.length - detached.size} parts remain`);
  assert(collector.isCleared(), `${level.name}: boxes or buffer did not clear`);
}

function verifyColorAmbiguity(level) {
  const stepsByLayer = new Map();
  for (const step of level.authoredSolution) {
    if (!stepsByLayer.has(step.layer)) stepsByLayer.set(step.layer, []);
    stepsByLayer.get(step.layer).push(step);
  }

  for (const [layer, steps] of stepsByLayer) {
    const partIds = new Set(steps.map(step => step.pieceId));
    if (partIds.size < 5) continue;
    const firstColors = [...new Set(steps.map(step => step.color))].slice(0, 2);
    for (const color of firstColors) {
      const matchingParts = new Set(steps.filter(step => step.color === color).map(step => step.pieceId));
      assert(
        matchingParts.size >= 3,
        `${level.name}: layer ${layer} exposes ${color} on only ${matchingParts.size} part(s)`,
      );
    }
    for (const partId of partIds) {
      const colors = new Set(steps.filter(step => step.pieceId === partId).map(step => step.color));
      assert(colors.size >= 2, `${level.name}: ${partId} is still a single-color giveaway`);
    }
  }
}

const cases = [
  [L_SHAPED_MANOR_LEVEL, 54, 4, 4],
  [CROSS_TOWER_LEVEL, 72, 5, 4],
  [FINAL_INNER_FRAME_LEVEL, 84, 6, 3],
];

for (const [level, screwCount, depth, bufferCapacity] of cases) {
  const validation = validateLevel(level);
  assert(validation.ok, `${level.name}: ${validation.errors.join('; ')}`);
  assert(level.authoredSolution.length === screwCount, `${level.name}: solution length mismatch`);
  assert(level.pieces.length * 3 === screwCount, `${level.name}: expected exactly three screws per part`);
  assert(level.binQueue.length * 3 === screwCount, `${level.name}: queue capacity mismatch`);
  assert(Math.max(...level.authoredSolution.map(step => step.layer)) === depth, `${level.name}: structural depth mismatch`);
  assert(level.rules.activeBoxCount === 2, `${level.name}: expert levels use two active boxes`);
  assert(level.rules.bufferCapacity === bufferCapacity, `${level.name}: buffer capacity mismatch`);
  verifyColorAmbiguity(level);
  verifyAuthoredSolution(level);
  console.log(`[PASS] ${level.name}: ${screwCount} screws / ${depth} layers / buffer ${bufferCapacity}`);
}

const cyclicLevel = {
  id: 'cycle-test',
  rules: { activeBoxCount: 2, boxCapacity: 3, bufferCapacity: 3 },
  binQueue: ['red', 'blue'],
  pieces: [
    { id: 'a', blockedBy: ['b'], screws: Array.from({ length: 3 }, () => ({ color: 'red' })) },
    { id: 'b', blockedBy: ['a'], screws: Array.from({ length: 3 }, () => ({ color: 'blue' })) },
  ],
};
const cycleValidation = validateLevel(cyclicLevel);
assert(!cycleValidation.ok, 'validator failed to reject a structural cycle');
assert(cycleValidation.errors.some(error => error.includes('Dependency cycle')), 'cycle error was not reported');
console.log('[PASS] dependency cycle validator');
