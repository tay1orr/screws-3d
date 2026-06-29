import {
  hasAttachedPartDependency,
  canReleaseUnfastenedPart,
} from '../src/2026-06-29-part-dependencies.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const part = (id, blockedBy = [], state = 'attached') => ({
  state,
  screws: [{}],
  spec: { id, blockedBy },
});

const cap = part('chimney-cap');
const body = part('chimney-body', ['chimney-cap']);
const roof = part('roof-front', ['chimney-body', 'chimney-cap']);
const rearRoof = part('roof-rear');
const parts = [roof, rearRoof, body, cap];

assert(hasAttachedPartDependency(body, parts), '굴뚝 덮개가 붙어 있으면 몸체가 잠겨야 합니다.');
assert(hasAttachedPartDependency(roof, parts), '굴뚝이 붙어 있으면 앞 지붕이 잠겨야 합니다.');
assert(!hasAttachedPartDependency(rearRoof, parts), '독립된 뒤 지붕은 잠기면 안 됩니다.');

cap.state = 'falling';
assert(!hasAttachedPartDependency(body, parts), '덮개가 떨어지기 시작하면 몸체 잠금이 풀려야 합니다.');
assert(hasAttachedPartDependency(roof, parts), '몸체가 붙어 있는 동안 앞 지붕은 계속 잠겨야 합니다.');

body.screws = [];
body.state = 'attached';
cap.state = 'attached';
assert(!canReleaseUnfastenedPart(body, parts), 'unfastened body must wait while its cap is attached');

cap.state = 'falling';
assert(canReleaseUnfastenedPart(body, parts), 'unfastened body must release after its cap starts falling');

body.state = 'falling';
assert(!hasAttachedPartDependency(roof, parts), '굴뚝 전체가 떨어지기 시작하면 앞 지붕 잠금이 풀려야 합니다.');

console.log('[PASS] chimney -> front roof structural dependency');
