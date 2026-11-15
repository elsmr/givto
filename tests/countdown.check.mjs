// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/countdown.check.mjs)
import assert from 'node:assert/strict';
import { countdown, countdownTo } from '../lib/local-date.ts';

const cases = [
  [0, 0, 'day'], [1, 1, 'day'], [10, 10, 'day'], [13, 13, 'day'],
  [14, 2, 'week'], [21, 3, 'week'], [35, 5, 'week'], [59, 8, 'week'],
  [60, 2, 'month'], [75, 2, 'month'], [364, 12, 'month'],
  [365, 1, 'year'], [800, 2, 'year'],
  [-3, -3, 'day'], [-51, -7, 'week'], [-90, -3, 'month'],
];
for (const [days, value, unit] of cases) assert.deepEqual(countdown(days), { value, unit }, `${days} days`);

// Gift day 24 Dec 2026 at 19:00 in Brussels (UTC+1): 18:00 UTC.
const at = (iso) => new Date(iso);
const tz = 'Europe/Brussels';
const timed = [
  ['2026-12-20T12:00:00Z', '19:00', { value: 4, unit: 'day' }],
  ['2026-12-23T17:00:00Z', '19:00', { value: 1, unit: 'day' }],
  ['2026-12-23T18:30:00Z', '19:00', { value: 23, unit: 'hour' }],
  ['2026-12-24T12:59:00Z', '19:00', { value: 5, unit: 'hour' }],
  ['2026-12-24T17:00:00Z', '19:00', { value: 1, unit: 'hour' }],
  ['2026-12-24T17:00:01Z', '19:00', { value: 3599, unit: 'second' }],
  ['2026-12-24T17:59:58.5Z', '19:00', { value: 2, unit: 'second' }],
  ['2026-12-24T18:00:00Z', '19:00', { value: 0, unit: 'day' }],
  ['2026-12-24T12:00:00Z', undefined, { value: 0, unit: 'day' }],
  ['2026-12-23T22:00:00Z', undefined, { value: 1, unit: 'day' }],
];
for (const [now, time, expected] of timed) assert.deepEqual(countdownTo('2026-12-24', time, tz, at(now)), expected, `${now} ${time}`);
console.log('countdown: ok');
