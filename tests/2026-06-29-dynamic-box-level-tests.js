import { TUTORIAL_LEVEL, WINDMILL_LEVEL } from '../src/2026-06-28-campaign-levels.js';
import { HARBOR_HOUSE_LEVEL, SUNSET_HOUSE_LEVEL } from '../src/2026-06-29-advanced-levels.js';
import { validateLevel } from '../src/2026-06-28-level-validator.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const cases = [
  [TUTORIAL_LEVEL, 18, 2],
  [WINDMILL_LEVEL, 30, 3],
  [HARBOR_HOUSE_LEVEL, 45, 3],
  [SUNSET_HOUSE_LEVEL, 45, 1],
];

for (const [level, expectedScrews, expectedBoxes] of cases) {
  const validation = validateLevel(level);
  assert(validation.ok, `${level.name}: ${validation.errors.join('; ')}`);
  const count = level.pieces.reduce((sum, part) => sum + (part.screws?.length ?? 0), 0);
  assert(count === expectedScrews, `${level.name}: ${count}개, 예상 ${expectedScrews}개`);
  assert(level.rules.activeBoxCount === expectedBoxes, `${level.name}: 상자 수 오류`);
  assert(expectedBoxes >= 1 && expectedBoxes <= 3, `${level.name}: 상자 수 범위 오류`);

  const ids = new Set(level.pieces.map(part => part.id).filter(Boolean));
  for (const part of level.pieces) {
    for (const blocker of part.blockedBy ?? []) {
      assert(ids.has(blocker), `${level.name}: 존재하지 않는 지지 부품 ${blocker}`);
    }
  }
  console.log(`[PASS] ${level.name}: ${count} screws / ${expectedBoxes} boxes`);
}
