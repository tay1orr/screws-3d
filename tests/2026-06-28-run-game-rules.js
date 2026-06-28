import { runTests } from './2026-06-28-game-rules.js';

const results = runTests();
for (const result of results) {
  const marker = result.pass ? 'PASS' : 'FAIL';
  console.log(`[${marker}] ${result.id} ${result.name}${result.reason ? ` — ${result.reason}` : ''}`);
}

const failures = results.filter(result => !result.pass);
console.log(`\n${results.length - failures.length}/${results.length} tests passed`);
if (failures.length > 0) process.exitCode = 1;
