import {
  hasAttachedPartDependency,
  canReleaseUnfastenedPart,
} from '../src/2026-06-29-part-dependencies.js';
import { ELITE_LEVELS } from '../src/2026-06-29-elite-levels.js';
import { MASTER_LEVELS } from '../src/2026-06-29-master-levels.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runtimeParts(level) {
  return level.pieces.map(spec => ({
    spec,
    state: 'attached',
    screws: spec.screws.map((_, index) => ({ index })),
  }));
}

function verifyDependencyLock(level) {
  const parts = runtimeParts(level);

  for (const part of parts) {
    const blockers = part.spec.blockedBy ?? [];
    if (blockers.length === 0) continue;

    // Each part is an independent lock scenario. Restore the full structure
    // before checking the next part so an earlier falling blocker cannot leak
    // into this assertion.
    for (const candidate of parts) candidate.state = 'attached';

    assert(
      hasAttachedPartDependency(part, parts),
      `${level.name}: ${part.spec.id} must stay locked while its upper layer is attached`,
    );

    for (const blockerId of blockers) {
      const blocker = parts.find(candidate => candidate.spec.id === blockerId);
      assert(blocker, `${level.name}: missing blocker ${blockerId}`);
      blocker.state = 'falling';
    }

    assert(
      !hasAttachedPartDependency(part, parts),
      `${level.name}: ${part.spec.id} must unlock as soon as every blocker starts falling`,
    );

    part.screws = [];
    assert(
      canReleaseUnfastenedPart(part, parts),
      `${level.name}: ${part.spec.id} must fall immediately after its final screw is removed`,
    );

    part.state = 'falling';
  }
}

function verifyFullRemovalOrder(level) {
  const parts = runtimeParts(level);
  const byId = new Map(parts.map(part => [part.spec.id, part]));
  const remaining = new Map(parts.map(part => [
    part.spec.id,
    new Set(part.spec.screws.map((_, index) => index)),
  ]));

  for (const [turn, step] of level.authoredSolution.entries()) {
    const part = byId.get(step.pieceId);
    assert(part, `${level.name}: turn ${turn + 1} references missing part ${step.pieceId}`);
    assert(
      !hasAttachedPartDependency(part, parts),
      `${level.name}: turn ${turn + 1} exposes ${step.pieceId} before its upper structure falls`,
    );

    const screws = remaining.get(step.pieceId);
    assert(screws.delete(step.screwIndex), `${level.name}: duplicate screw at turn ${turn + 1}`);
    part.screws = Array.from(screws, index => ({ index }));

    if (part.screws.length === 0) {
      assert(
        canReleaseUnfastenedPart(part, parts),
        `${level.name}: ${part.spec.id} remains attached with zero screws`,
      );
      part.state = 'falling';
    }
  }

  assert(
    parts.every(part => part.state === 'falling'),
    `${level.name}: at least one structure did not fall`,
  );
}

function verticalHalfExtent(spec) {
  const [width, height, depth] = spec.size;
  const [rx = 0, ry = 0, rz = 0] = spec.rot ?? [];
  assert(Math.abs(ry) < 1e-9, `${spec.id}: roof clearance check does not support Y rotation`);
  if (Math.abs(rx) > 1e-9) {
    return Math.abs(Math.cos(rx)) * height / 2 + Math.abs(Math.sin(rx)) * depth / 2;
  }
  if (Math.abs(rz) > 1e-9) {
    return Math.abs(Math.sin(rz)) * width / 2 + Math.abs(Math.cos(rz)) * height / 2;
  }
  return height / 2;
}

function verifyLevel12RoofClearance(level) {
  const mainRoof = level.pieces.filter(part => part.id.startsWith('l12-main-roof-'));
  const crossRoof = level.pieces.filter(part => part.id.startsWith('l12-cross-roof-'));
  assert(mainRoof.length === 2, `${level.name}: main roof pair missing`);
  assert(crossRoof.length === 2, `${level.name}: cross roof pair missing`);

  const mainTop = Math.max(...mainRoof.map(part => part.pos[1] + verticalHalfExtent(part)));
  const crossBottom = Math.min(...crossRoof.map(part => part.pos[1] - verticalHalfExtent(part)));
  assert(
    crossBottom >= mainTop,
    `${level.name}: cross roof penetrates main roof by ${(mainTop - crossBottom).toFixed(3)}`,
  );
}

for (const level of [...ELITE_LEVELS, ...MASTER_LEVELS]) {
  verifyDependencyLock(level);
  verifyFullRemovalOrder(level);
  console.log(`[PASS] ${level.name}: structural lock and immediate fall`);
}

const level12 = MASTER_LEVELS.find(level => level.id === 'cross-corridor-workshop-12');
assert(level12, '12단계 교차 회랑 공방을 찾을 수 없습니다.');
verifyLevel12RoofClearance(level12);
console.log('[PASS] 교차 회랑 공방: main/cross roof vertical clearance');
