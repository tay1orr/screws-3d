import { createProgressStore } from '../src/2026-06-28-progress-store.js';

const memory = new Map();
globalThis.localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (error) {
    results.push({ name, pass: false, reason: error.message });
  }
}

test('첫 실행에서는 첫 레벨만 열린다', () => {
  memory.clear();
  const store = createProgressStore(3);
  assert(store.isUnlocked(0), '첫 레벨이 잠겨 있음');
  assert(!store.isUnlocked(1), '두 번째 레벨이 미리 열림');
});

test('레벨 완료 시 다음 레벨이 열리고 저장된다', () => {
  memory.clear();
  const store = createProgressStore(3);
  const result = store.complete(0);
  assert(result.hasNext, '다음 레벨이 있어야 함');
  assert(store.isUnlocked(1), '다음 레벨이 열리지 않음');
  const restored = createProgressStore(3);
  assert(restored.isUnlocked(1), '새 인스턴스에서 진행도가 복원되지 않음');
  assert(restored.isCompleted(0), '완료 상태가 복원되지 않음');
});

test('마지막 레벨은 다음 레벨을 만들지 않는다', () => {
  memory.clear();
  const store = createProgressStore(2);
  store.complete(0);
  const result = store.complete(1);
  assert(!result.hasNext, '마지막 레벨 뒤에 다음 레벨이 표시됨');
  assert(!store.isUnlocked(2), '범위 밖 레벨이 열림');
});

test('JDY 해금은 모든 레벨을 열고 저장한다', () => {
  memory.clear();
  const store = createProgressStore(7);
  store.unlockAll();
  for (let index = 0; index < 7; index++) {
    assert(store.isUnlocked(index), `${index + 1}단계가 열리지 않음`);
  }
  const restored = createProgressStore(7);
  assert(restored.isUnlocked(6), '새 인스턴스에서 전체 해금이 복원되지 않음');
  assert(!restored.isCompleted(6), '해금만 했는데 완료 처리됨');
});

for (const result of results) {
  console.log(`[${result.pass ? 'PASS' : 'FAIL'}] ${result.name}${result.reason ? ` — ${result.reason}` : ''}`);
}
const failures = results.filter(result => !result.pass);
console.log(`\n${results.length - failures.length}/${results.length} progress tests passed`);
if (failures.length) process.exitCode = 1;
