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

  // ---- soft warnings ----
  if (totalScrews === 0) {
    warnings.push('Level has zero screws');
  }
  if (queue.length < 2) {
    warnings.push(`Queue has only ${queue.length} bin(s) — the second active box will start empty`);
  }

  return { errors, warnings, ok: errors.length === 0 };
}
