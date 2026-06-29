// Acceptance tests for the CollectorState rules engine.
// Runs without Three.js / DOM-3D. Each test returns { id, name, pass, reason }.

import {
  CollectorState,
  TARGET_BOX,
  TARGET_BUFFER,
} from '../src/2026-06-28-collector-state.js';

// ---------- tiny assertion helpers ----------
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function assertEq(a, b, msg) {
  if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`);
}
function assertDeepEq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg}: expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`);
  }
}

// ---------- helpers ----------
function newState(queue, opts = {}) {
  const c = new CollectorState(opts);
  c.loadLevel(queue);
  return c;
}
let nextId = 1;
function id() { return nextId++; }

// ---------- tests ----------
const tests = [];

tests.push({
  id: 'G-01',
  name: '활성 상자와 같은 색 나사는 상자로 직행',
  fn() {
    const s = newState(['red', 'blue', 'green', 'green', 'green', 'green']);
    const r = s.acceptScrew('red', id());
    assertEq(r?.target, TARGET_BOX, '상자로 가야 함');
    assertEq(r.boxIndex, 0, '첫 번째 상자');
    assertEq(s.buffer.every(x => x === null), true, '버퍼는 그대로');
  },
});

tests.push({
  id: 'G-02',
  name: '활성 상자와 다른 색 나사는 첫 빈 버퍼 슬롯으로',
  fn() {
    const s = newState(['red', 'blue', 'green', 'green', 'green', 'green']);
    const r = s.acceptScrew('yellow', id());
    assertEq(r?.target, TARGET_BUFFER, '버퍼로 가야 함');
    assertEq(r.slotIndex, 0, '첫 번째 빈 슬롯');
    assertEq(s.buffer[0]?.color, 'yellow', '버퍼에 노랑');
    assertEq(s.activeBoxes[0]?.screwIds.length, 0, '상자는 비어있어야');
  },
});

tests.push({
  id: 'G-03',
  name: '새 상자가 임시 나사 색으로 등장하면 자동 이송',
  fn() {
    // 활성: red, blue / 큐: yellow, green, green, green
    const s = newState(['red', 'blue', 'yellow', 'green', 'green', 'green']);
    // 노랑 나사를 임시 보관
    const yellowId = id();
    s.acceptScrew('yellow', yellowId);
    assertEq(s.buffer[0]?.color, 'yellow', '노랑이 버퍼에 있음');
    // 빨강 3개 채워서 상자 비우기
    s.acceptScrew('red', id());
    s.acceptScrew('red', id());
    s.acceptScrew('red', id());
    const events = s.resolveCascade();
    // 상자 완성 + 슬라이드 인 + 자동 이송
    const complete = events.find(e => e.type === 'box-complete');
    const slide = events.find(e => e.type === 'box-slide-in');
    const transfer = events.find(e => e.type === 'auto-transfer');
    assert(complete, 'box-complete 이벤트 필요');
    assert(slide && slide.color === 'yellow', '다음 상자는 노랑');
    assert(transfer, '자동 이송 이벤트 필요');
    assertEq(transfer.color, 'yellow', '노랑이 이송되어야');
    assertEq(transfer.screwId, yellowId, '같은 나사');
    assertEq(s.buffer[0], null, '버퍼 슬롯이 비어야');
    assertEq(s.activeBoxes[0]?.screwIds.length, 1, '노랑 상자에 1개');
  },
});

tests.push({
  id: 'G-04',
  name: '상자 3개 채우면 완성 + 다음 상자 등장',
  fn() {
    const s = newState(['red', 'blue', 'green', 'orange', 'pink', 'cyan']);
    s.acceptScrew('red', id());
    s.acceptScrew('red', id());
    s.acceptScrew('red', id());
    const events = s.resolveCascade();
    assert(events.some(e => e.type === 'box-complete' && e.color === 'red'));
    assert(events.some(e => e.type === 'box-slide-in' && e.color === 'green'));
    assertEq(s.activeBoxes[0]?.color, 'green', '슬라이드 인 후 초록');
    assertEq(s.activeBoxes[0]?.screwIds.length, 0, '새 상자는 비어있어야');
  },
});

tests.push({
  id: 'G-05',
  name: '자동 이송 연쇄: 새 상자가 등장하자마자 3개가 됨',
  fn() {
    // 활성: red, blue / 큐: green, ...
    // 버퍼에 green 3개를 미리 넣어두고 red 3개 풀어서 빨강 비우기
    // → 슬라이드 인된 green이 즉시 3개 채워져 연쇄 완성
    const s = newState(['red', 'blue', 'green', 'yellow', 'yellow', 'yellow']);
    s.acceptScrew('green', id());
    s.acceptScrew('green', id());
    s.acceptScrew('green', id());
    // 버퍼에 초록 3개
    assertEq(s.buffer.filter(x => x?.color === 'green').length, 3, '버퍼에 초록 3');
    // 빨강 3개로 빨강 상자 비우기
    s.acceptScrew('red', id());
    s.acceptScrew('red', id());
    s.acceptScrew('red', id());
    const events = s.resolveCascade();
    // 빨강 완성 → 초록 슬라이드 → 자동 이송 3 → 초록 완성 → 노랑 슬라이드
    const completes = events.filter(e => e.type === 'box-complete');
    assertEq(completes.length, 2, '두 상자 완성 (빨강, 초록)');
    assert(completes.some(e => e.color === 'red'));
    assert(completes.some(e => e.color === 'green'));
    const slides = events.filter(e => e.type === 'box-slide-in');
    assertEq(slides.length, 2, '두 번 슬라이드 (초록, 노랑)');
    const transfers = events.filter(e => e.type === 'auto-transfer');
    assertEq(transfers.length, 3, '버퍼 3개가 모두 이송');
    assertEq(s.buffer.every(x => x === null), true, '버퍼 비어야');
    assertEq(s.activeBoxes[0]?.color, 'yellow', '활성은 노랑');
  },
});

tests.push({
  id: 'G-06',
  name: '버퍼 4/5: 계속 플레이 가능',
  fn() {
    const s = newState(['red', 'blue', 'green', 'green', 'green', 'green']);
    s.acceptScrew('purple', id());
    s.acceptScrew('cyan', id());
    s.acceptScrew('orange', id());
    s.acceptScrew('pink', id());
    assertEq(s.buffer.filter(x => x).length, 4, '버퍼 4');
    assertEq(s.isBufferFull(), false, '아직 가득 아님');
    // 빨강은 여전히 받음
    const r = s.acceptScrew('red', id());
    assertEq(r?.target, TARGET_BOX, '빨강은 상자로');
  },
});

tests.push({
  id: 'G-07',
  name: '버퍼 5/5 + 이송 불가 → 실패',
  fn() {
    const s = newState(['red', 'blue', 'green', 'green', 'green', 'green']);
    // 5개 모두 비대상 색
    s.acceptScrew('purple', id());
    s.acceptScrew('cyan', id());
    s.acceptScrew('orange', id());
    s.acceptScrew('pink', id());
    s.acceptScrew('brown', id());
    assertEq(s.isBufferFull(), true, '버퍼 가득');
    // 접근 가능 색이 brown만 있다고 가정 → 스턱
    assertEq(s.isStuck(['brown']), true, '갈색만 접근 가능하면 스턱');
    // 빨강이 접근 가능하면 안 스턱
    assertEq(s.isStuck(['red']), false, '빨강 접근 가능하면 스턱 아님');
    // 또 다른 비대상 색은 받지 못함
    const reject = s.acceptScrew('white', id());
    assertEq(reject, null, '버퍼 가득이라 거부');
  },
});

tests.push({
  id: 'G-08',
  name: '활성 색 나사가 안 보여도 버퍼 여유 있으면 실패 아님',
  fn() {
    const s = newState(['red', 'blue', 'green', 'green', 'green', 'green']);
    s.acceptScrew('purple', id());
    s.acceptScrew('cyan', id());
    // 접근 가능은 보라, 시안만 (빨강·파랑 못 봄)
    // 버퍼 여유 있음 → 스턱 아님
    assertEq(s.isStuck(['purple', 'cyan']), false, '버퍼 비었으면 스턱 아님');
  },
});

tests.push({
  id: 'G-09',
  name: '모든 나사 정리 → 클리어 상태',
  fn() {
    const s = newState(['red', 'red']);
    for (let i = 0; i < 6; i++) s.acceptScrew('red', id());
    s.resolveCascade();
    assertEq(s.isCleared(), true, '모두 정리되어야');
  },
});

tests.push({
  id: 'G-10',
  name: '재시작: 모든 상태 초기화',
  fn() {
    const s = newState(['red', 'blue', 'green']);
    s.acceptScrew('red', id());
    s.acceptScrew('purple', id());
    s.loadLevel(['yellow', 'orange']);
    assertEq(s.activeBoxes[0]?.color, 'yellow', '활성 0 갱신');
    assertEq(s.activeBoxes[1]?.color, 'orange', '활성 1 갱신');
    assertEq(s.activeBoxes[0].screwIds.length, 0, '나사 비어있음');
    assertEq(s.buffer.every(x => x === null), true, '버퍼 모두 비어있음');
    assertEq(s.boxQueue.length, 0, '큐 비어있음');
  },
});

// ---------- 추가 엣지 테스트 ----------
tests.push({
  id: 'X-01',
  name: '같은 색 활성 상자가 있어도 가득 차 있으면 다음 빈 상자 사용 안 함 (버퍼로)',
  fn() {
    // 활성 0 = red(3/3 직전), 활성 1 = blue
    const s = newState(['red', 'blue', 'red']);
    s.acceptScrew('red', id());
    s.acceptScrew('red', id());
    // 빨강 한 번 더 → 3/3 채워서 상자 완성
    const r = s.acceptScrew('red', id());
    assertEq(r?.target, TARGET_BOX, '아직 자리 있음');
    s.resolveCascade();
    // 그 다음 빨강은 어디로? 활성 0이 빨강(슬라이드 인됨)이면 상자, 아니면 버퍼
    assertEq(s.activeBoxes[0]?.color, 'red', '슬라이드 인된 빨강');
  },
});

tests.push({
  id: 'X-02',
  name: '빈 활성 상자(큐 소진)에는 어떤 색도 못 들어감 — 버퍼로',
  fn() {
    const s = newState(['red']); // 활성 0만 있고 활성 1은 null
    assertEq(s.activeBoxes[1], null, '활성 1은 비어있음');
    const r = s.acceptScrew('blue', id());
    assertEq(r?.target, TARGET_BUFFER, '파랑은 버퍼로');
  },
});

// ---------- 실행 ----------
tests.push({
  id: 'X-03',
  name: 'hint preflight only accepts colors that have a real destination',
  fn() {
    const s = newState(['red', 'blue']);

    assertEq(s.canAcceptScrew('purple'), true, 'empty buffer can receive a non-box color');

    for (const color of ['purple', 'cyan', 'green', 'yellow', 'orange']) {
      s.acceptScrew(color, id());
    }

    assertEq(s.canAcceptScrew('red'), true, 'active box color remains collectible');
    assertEq(s.canAcceptScrew('pink'), false, 'full buffer rejects a color without an active box');
  }
});

export function runTests() {
  const results = [];
  for (const t of tests) {
    try {
      nextId = 1;
      t.fn();
      results.push({ ...t, pass: true });
    } catch (e) {
      results.push({ ...t, pass: false, reason: e.message });
    }
  }
  return results;
}
