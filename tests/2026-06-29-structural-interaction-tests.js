import {
  hasAttachedPartDependency,
  canReleaseUnfastenedPart,
} from '../src/2026-06-29-part-dependencies.js';
import { CollectorState } from '../src/2026-06-28-collector-state.js';
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

function addVector(a, b) {
  return a.map((value, index) => value + b[index]);
}

function scaleVector(vector, scale) {
  return vector.map(value => value * scale);
}

function rotateVector(vector, rotation = [0, 0, 0]) {
  let [x, y, z] = vector;
  const [rx = 0, ry = 0, rz = 0] = rotation;
  let cosine = Math.cos(rx);
  let sine = Math.sin(rx);
  [y, z] = [cosine * y - sine * z, sine * y + cosine * z];
  cosine = Math.cos(ry);
  sine = Math.sin(ry);
  [x, z] = [cosine * x + sine * z, -sine * x + cosine * z];
  cosine = Math.cos(rz);
  sine = Math.sin(rz);
  [x, y] = [cosine * x - sine * y, sine * x + cosine * y];
  return [x, y, z];
}

function inverseRotateVector(vector, rotation = [0, 0, 0]) {
  let [x, y, z] = vector;
  const [rx = 0, ry = 0, rz = 0] = rotation;
  let cosine = Math.cos(-rz);
  let sine = Math.sin(-rz);
  [x, y] = [cosine * x - sine * y, sine * x + cosine * y];
  cosine = Math.cos(-ry);
  sine = Math.sin(-ry);
  [x, z] = [cosine * x + sine * z, -sine * x + cosine * z];
  cosine = Math.cos(-rx);
  sine = Math.sin(-rx);
  [y, z] = [cosine * y - sine * z, sine * y + cosine * z];
  return [x, y, z];
}

function rayHitsPart(origin, direction, part, far = 2.5) {
  const localOrigin = inverseRotateVector(
    origin.map((value, index) => value - part.spec.pos[index]),
    part.spec.rot,
  );
  const localDirection = inverseRotateVector(direction, part.spec.rot);
  const halfSize = part.spec.size.map(value => value / 2);
  let near = 0;
  let limit = far;

  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(localDirection[axis]) < 1e-9) {
      if (localOrigin[axis] < -halfSize[axis] || localOrigin[axis] > halfSize[axis]) return false;
      continue;
    }
    let start = (-halfSize[axis] - localOrigin[axis]) / localDirection[axis];
    let end = (halfSize[axis] - localOrigin[axis]) / localDirection[axis];
    if (start > end) [start, end] = [end, start];
    near = Math.max(near, start);
    limit = Math.min(limit, end);
    if (near > limit) return false;
  }
  return true;
}

function findPhysicalBlockers(part, screwIndex, parts) {
  const screw = part.spec.screws[screwIndex];
  const normal = rotateVector(screw.normal, part.spec.rot);
  const position = addVector(part.spec.pos, rotateVector(screw.localPos, part.spec.rot));
  const origin = addVector(position, scaleVector(normal, 0.04));
  return parts.filter(candidate =>
    candidate !== part
    && candidate.state === 'attached'
    && rayHitsPart(origin, normal, candidate)
  ).map(candidate => candidate.spec.id);
}

function isScrewPhysicallyBlocked(part, screwIndex, parts) {
  return findPhysicalBlockers(part, screwIndex, parts).length > 0;
}

function cloneCollector(source, rules) {
  const clone = new CollectorState(rules);
  clone.activeBoxes = source.activeBoxes.map(box => box
    ? { color: box.color, screwIds: box.screwIds.slice() }
    : null);
  clone.boxQueue = source.boxQueue.slice();
  clone.buffer = source.buffer.map(entry => entry ? { ...entry } : null);
  return clone;
}

function collectorKey(collector) {
  return JSON.stringify({
    boxes: collector.activeBoxes.map(box => box ? [box.color, box.screwIds.length] : null),
    queue: collector.boxQueue,
    buffer: collector.buffer.map(entry => entry?.color ?? null),
  });
}

function verifyPlayableWithGeometry(level) {
  let collector = new CollectorState(level.rules);
  collector.loadLevel(level.binQueue);
  const parts = level.pieces.map(spec => ({ spec, state: 'attached' }));
  const maxLayer = Math.max(...level.pieces.map(part => part.structuralLayer));

  for (let layer = 1; layer <= maxLayer; layer++) {
    const layerParts = parts.filter(part => part.spec.structuralLayer === layer);
    const layerScrews = layerParts.flatMap(part => part.spec.screws.map((screw, index) => ({
      part,
      index,
      color: screw.color,
      id: `${part.spec.id}:${index}`,
    })));
    assert(layerScrews.length <= 30, `${level.name}: layer ${layer} exceeds bitmask capacity`);
    const fullMask = (1 << layerScrews.length) - 1;
    const partMasks = new Map(layerParts.map(part => [
      part,
      layerScrews.reduce((mask, screw, bit) => screw.part === part ? mask | (1 << bit) : mask, 0),
    ]));
    const memo = new Set();
    let bestMask = 0;

    function setPartStates(mask) {
      for (const part of parts) {
        if (part.spec.structuralLayer < layer) part.state = 'falling';
        else if (part.spec.structuralLayer > layer) part.state = 'attached';
        else part.state = (mask & partMasks.get(part)) === partMasks.get(part)
          ? 'falling'
          : 'attached';
      }
    }

    function search(mask, currentCollector) {
      if (mask === fullMask) return currentCollector;
      if (mask.toString(2).replace(/0/g, '').length > bestMask.toString(2).replace(/0/g, '').length) {
        bestMask = mask;
      }
      const key = `${mask}|${collectorKey(currentCollector)}`;
      if (memo.has(key)) return null;
      memo.add(key);
      setPartStates(mask);

      const candidates = layerScrews
        .map((screw, bit) => ({ ...screw, bit }))
        .filter(screw => !(mask & (1 << screw.bit)))
        .filter(screw => !isScrewPhysicallyBlocked(screw.part, screw.index, parts))
        .filter(screw => currentCollector.canAcceptScrew(screw.color))
        .sort((a, b) => {
          const aBox = currentCollector.findBoxForColor(a.color) >= 0 ? 0 : 1;
          const bBox = currentCollector.findBoxForColor(b.color) >= 0 ? 0 : 1;
          return aBox - bBox || a.bit - b.bit;
        });

      for (const screw of candidates) {
        const nextCollector = cloneCollector(currentCollector, level.rules);
        const accepted = nextCollector.acceptScrew(screw.color, screw.id);
        if (!accepted) continue;
        nextCollector.resolveCascade();
        const result = search(mask | (1 << screw.bit), nextCollector);
        if (result) return result;
        setPartStates(mask);
      }
      return null;
    }

    const solvedCollector = search(0, collector);
    if (!solvedCollector) {
      setPartStates(bestMask);
      const unresolved = layerScrews
        .map((screw, bit) => ({ ...screw, bit }))
        .filter(screw => !(bestMask & (1 << screw.bit)))
        .map(screw => `${screw.id}:${screw.color}`
          + ` physical=[${findPhysicalBlockers(screw.part, screw.index, parts).join(',')}]`);
      assert(false, `${level.name}: layer ${layer} has no geometry/collector solution; ${unresolved.join(' | ')}`);
    }
    collector = solvedCollector;
    setPartStates(fullMask);
  }

  assert(collector.isCleared(), `${level.name}: collector is not cleared after geometric solution`);
}

for (const level of [...ELITE_LEVELS, ...MASTER_LEVELS]) {
  verifyDependencyLock(level);
  verifyFullRemovalOrder(level);
  verifyPlayableWithGeometry(level);
  console.log(`[PASS] ${level.name}: structural lock and immediate fall`);
}

const level12 = MASTER_LEVELS.find(level => level.id === 'cross-corridor-workshop-12');
assert(level12, '12단계 교차 회랑 공방을 찾을 수 없습니다.');
verifyLevel12RoofClearance(level12);
console.log('[PASS] 교차 회랑 공방: main/cross roof vertical clearance');
