// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/countdown.check.mjs)
import assert from 'node:assert/strict';
import { countdown } from '../lib/local-date.ts';

const cases = [
  [0, 0, 'day'], [1, 1, 'day'], [10, 10, 'day'], [13, 13, 'day'],
  [14, 2, 'week'], [21, 3, 'week'], [29, 4, 'week'],
  [30, 1, 'month'], [45, 1, 'month'], [51, 2, 'month'], [364, 12, 'month'],
  [365, 1, 'year'], [800, 2, 'year'],
  [-3, -3, 'day'], [-51, -2, 'month'],
];
for (const [days, value, unit] of cases) assert.deepEqual(countdown(days), { value, unit }, `${days} days`);
console.log('countdown: ok');
