// Static checks that catch a malformed level before it reaches the
// renderer or the player. Runs in Game.loadLevel() and logs any errors
// to the console — it doesn't block the level, just surfaces the bug.

export function validateLevel(level) {
  const errors = [];
  const warnings = [];

  if (!level || typeof level !== 'object') {
    errors.push('Level is null or not an object');
    return { errors, warnings, ok: false };
  }

  // Accept both legacy array-of-pieces and { binQueue, pieces } shape.
  const pieces  = Array.isArray(level) ? level : (level.pieces ?? []);
  const queue   = Array.isArray(level) ? []    : (level.binQueue ?? []);

  // ---- screw color tally ----
  const screwCounts = {};
  let totalScrews = 0;
  for (const piece of pieces) {
    for (const screw of (piece.screws ?? [])) {
      screwCounts[screw.color] = (screwCounts[screw.color] ?? 0) + 1;
      totalScrews++;
    }
  }

  // ---- queue color tally ----
  const queueBinCounts = {};
  for (const c of queue) {
    queueBinCounts[c] = (queueBinCounts[c] ?? 0) + 1;
  }

  // ---- rule 1: every screw color must be a multiple of 3 ----
  for (const [color, count] of Object.entries(screwCounts)) {
    if (count % 3 !== 0) {
      errors.push(`${color}: ${count} screws — not a multiple of 3 (can never clear)`);
    }
  }

  // ---- rule 2: queue bin × 3 must equal screws for that color ----
  for (const [color, count] of Object.entries(screwCounts)) {
    const expected = (queueBinCounts[color] ?? 0) * 3;
    if (count !== expected) {
      errors.push(
        `${color}: ${count} screws but queue has ${queueBinCounts[color] ?? 0} bin(s) → expected ${expected}`
      );
    }
  }

  // ---- rule 3: every queued color must have screws ----
  for (const color of Object.keys(queueBinCounts)) {
    if (!(color in screwCounts)) {
      errors.push(`Queue references "${color}" but no screws of that color exist`);
    }
  }

  // ---- rule 4: queue × 3 should equal total screws (sanity) ----
  const queueTotal = queue.length * 3;
  if (queueTotal !== totalScrews) {
    errors.push(
      `Queue has ${queue.length} bins (${queueTotal} screw capacity) but level has ${totalScrews} screws`
    );
  }

  // ---- rule 5: structural dependency IDs must be unique and resolvable ----
  const idCounts = new Map();
  for (const part of pieces) {
    if (!part.id) continue;
    idCounts.set(part.id, (idCounts.get(part.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) errors.push(`Duplicate part id "${id}" (${count} occurrences)`);
  }

  const partIds = new Set(idCounts.keys());
  const dependencies = new Map();
  for (const part of pieces) {
    const blockers = part.blockedBy ?? [];
    if (blockers.length > 0 && !part.id) {
      errors.push('A part with blockedBy must have its own id');
      continue;
    }
    dependencies.set(part.id, blockers);
    for (const blocker of blockers) {
      if (!partIds.has(blocker)) errors.push(`${part.id}: missing blocker "${blocker}"`);
      if (blocker === part.id) errors.push(`${part.id}: part cannot block itself`);
    }
  }

  // ---- rule 6: dependency graph must not contain a cycle ----
  const visiting = new Set();
  const visited = new Set();
  function visit(id, trail) {
    if (!id || visited.has(id) || !partIds.has(id)) return;
    if (visiting.has(id)) {
      errors.push(`Dependency cycle: ${[...trail, id].join(' -> ')}`);
      return;
    }
    visiting.add(id);
    for (const blocker of dependencies.get(id) ?? []) visit(blocker, [...trail, id]);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of partIds) visit(id, []);

  // ---- rule 7: authored structural layers may only depend on earlier layers ----
  const piecesById = new Map(pieces.filter(part => part.id).map(part => [part.id, part]));
  for (const part of pieces) {
    if (part.structuralLayer === undefined) continue;
    if (!Number.isInteger(part.structuralLayer) || part.structuralLayer < 1) {
      errors.push(`${part.id}: structuralLayer must be a positive integer`);
      continue;
    }
    if (part.structuralLayer > 1 && (part.blockedBy ?? []).length === 0) {
      errors.push(`${part.id}: structural layer ${part.structuralLayer} has no supporting dependency`);
    }
    for (const blockerId of part.blockedBy ?? []) {
      const blocker = piecesById.get(blockerId);
      if (blocker?.structuralLayer !== undefined && blocker.structuralLayer >= part.structuralLayer) {
        errors.push(`${part.id}: support ${blockerId} must be in an earlier structural layer`);
      }
    }
  }

  // ---- rule 8: authored solution must cover every screw exactly once and
  // never select a part while one of its supports is still attached ----
  const solution = Array.isArray(level) ? [] : (level.authoredSolution ?? []);
  if (solution.length > 0) {
    if (solution.length !== totalScrews) {
      errors.push(`Authored solution has ${solution.length} turns for ${totalScrews} screws`);
    }
    const remainingByPart = new Map(
      pieces.filter(part => part.id).map(part => [part.id, part.screws?.length ?? 0])
    );
    const selected = new Set();
    for (let turn = 0; turn < solution.length; turn++) {
      const step = solution[turn];
      const part = piecesById.get(step.pieceId);
      if (!part) {
        errors.push(`Authored turn ${turn + 1} references missing part "${step.pieceId}"`);
        continue;
      }
      const key = `${step.pieceId}:${step.screwIndex}`;
      if (selected.has(key)) errors.push(`Authored solution selects ${key} more than once`);
      selected.add(key);
      const item = part.screws?.[step.screwIndex];
      if (!item) errors.push(`Authored turn ${turn + 1} references missing screw ${key}`);
      else if (item.color !== step.color) errors.push(`Authored turn ${turn + 1} has the wrong color for ${key}`);
      for (const blockerId of part.blockedBy ?? []) {
        if ((remainingByPart.get(blockerId) ?? 0) > 0) {
          errors.push(`Authored turn ${turn + 1} selects ${part.id} before support ${blockerId}`);
          break;
        }
      }
      remainingByPart.set(step.pieceId, Math.max(0, (remainingByPart.get(step.pieceId) ?? 0) - 1));
    }
  }

  // ---- rule 9: collector dimensions must match the supported UI ----
  if (!Array.isArray(level)) {
    const activeBoxCount = level.rules?.activeBoxCount ?? 2;
    const bufferCapacity = level.rules?.bufferCapacity ?? 5;
    if (!Number.isInteger(activeBoxCount) || activeBoxCount < 1 || activeBoxCount > 3) {
      errors.push(`activeBoxCount must be an integer from 1 to 3 (received ${activeBoxCount})`);
    }
    if (!Number.isInteger(bufferCapacity) || bufferCapacity < 1) {
      errors.push(`bufferCapacity must be a positive integer (received ${bufferCapacity})`);
    }
    if (queue.length < activeBoxCount) {
      warnings.push(`Queue has fewer bins (${queue.length}) than active boxes (${activeBoxCount})`);
    }
  }

  // ---- soft warnings ----
  if (totalScrews === 0) {
    warnings.push('Level has zero screws');
  }
  if (queue.length < 2) {
    warnings.push(`Queue has only ${queue.length} bin(s) — the second active box will start empty`);
  }

  return { errors, warnings, ok: errors.length === 0 };
}
