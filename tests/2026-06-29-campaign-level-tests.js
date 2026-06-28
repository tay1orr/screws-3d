import { TUTORIAL_LEVEL, WINDMILL_LEVEL } from '../src/2026-06-28-campaign-levels.js';
import { CollectorState } from '../src/2026-06-28-collector-state.js';
import { validateLevel } from '../src/2026-06-28-level-validator.js';

const levels = [TUTORIAL_LEVEL, WINDMILL_LEVEL];
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function theoreticalSolve(level) {
  const collector = new CollectorState({ activeBoxCount: 2, boxCapacity: 3, bufferCapacity: 5 });
  collector.loadLevel(level.binQueue);
  const byColor = new Map();
  let id = 1;
  for (const part of level.pieces) {
    for (const screw of part.screws ?? []) {
      if (!byColor.has(screw.color)) byColor.set(screw.color, []);
      byColor.get(screw.color).push(id++);
    }
  }

  let guard = 0;
  while ([...byColor.values()].some(ids => ids.length > 0) && guard++ < 1000) {
    const activeColor = collector.activeBoxes
      .map(box => box?.color)
      .find(color => color && (byColor.get(color)?.length ?? 0) > 0);
    assert(activeColor, '활성 상자에 넣을 수 있는 나사가 없어 진행이 멈춤');
    const screwId = byColor.get(activeColor).shift();
    const accepted = collector.acceptScrew(activeColor, screwId);
    assert(accepted, `${activeColor} 나사를 수집하지 못함`);
    collector.resolveCascade();
  }
  collector.resolveCascade();
  assert(guard < 1000, '풀이 반복 제한 초과');
  assert(collector.isCleared(), '모든 상자와 버퍼가 정리되지 않음');
}

for (const level of levels) {
  try {
    const validation = validateLevel(level);
    assert(validation.ok, validation.errors.join('; '));
    for (const part of level.pieces) {
      assert(Array.isArray(part.size) && part.size.length === 3, '부품 size 형식 오류');
      assert(part.size.every(value => value > 0), '부품 크기는 양수여야 함');
      for (const item of part.screws ?? []) {
        assert(Array.isArray(item.localPos) && item.localPos.length === 3, '나사 위치 형식 오류');
        assert(Array.isArray(item.normal) && item.normal.length === 3, '나사 법선 형식 오류');
      }
    }
    theoreticalSolve(level);
    const screwCount = level.pieces.reduce((sum, part) => sum + (part.screws?.length ?? 0), 0);
    results.push({ name: `${level.name} (${screwCount} screws)`, pass: true });
  } catch (error) {
    results.push({ name: level.name, pass: false, reason: error.message });
  }
}

assert(results[0]?.name.includes('18 screws'), '튜토리얼은 18개 나사여야 함');
assert(results[1]?.name.includes('48 screws'), '풍차는 48개 나사여야 함');

for (const result of results) {
  console.log(`[${result.pass ? 'PASS' : 'FAIL'}] ${result.name}${result.reason ? ` — ${result.reason}` : ''}`);
}
const failures = results.filter(result => !result.pass);
console.log(`\n${results.length - failures.length}/${results.length} campaign levels passed`);
if (failures.length) process.exitCode = 1;
