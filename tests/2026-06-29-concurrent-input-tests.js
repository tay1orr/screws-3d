import { CollectorState, TARGET_BOX, TARGET_BUFFER } from '../src/2026-06-28-collector-state.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const collector = new CollectorState({ activeBoxCount: 2, boxCapacity: 3, bufferCapacity: 5 });
collector.loadLevel(['red', 'blue', 'green', 'yellow']);

collector.acceptScrew('red', 1);
collector.acceptScrew('red', 2);
collector.acceptScrew('red', 3);

const blueDuringRedCompletion = collector.acceptScrew('blue', 4);
assert(blueDuringRedCompletion?.target === TARGET_BOX, '완성 중인 빨강 상자가 파랑 상자 입력까지 막음');
assert(blueDuringRedCompletion.boxIndex === 1, '파랑 나사가 잘못된 상자로 감');

const yellowDuringRedCompletion = collector.acceptScrew('yellow', 5);
assert(yellowDuringRedCompletion?.target === TARGET_BUFFER, '상자 교체 중 임시 칸 입력이 막힘');

const events = collector.resolveCascadeStep();
assert(events.some(event => event.type === 'box-complete' && event.boxIndex === 0), '빨강 상자 완료 이벤트 누락');
assert(collector.activeBoxes[0]?.color === 'green', '다음 초록 상자가 활성화되지 않음');
assert(collector.activeBoxes[1]?.screwIds.includes(4), '동시 입력한 파랑 나사가 유실됨');

console.log('[PASS] full box does not globally lock other destinations');
