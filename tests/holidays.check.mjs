// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/holidays.check.mjs)
import assert from 'node:assert/strict';
import { holidayOn } from '../lib/local-date.ts';

const cases = [
  ['2026-12-24', 'christmasEve'], ['2026-12-25', 'christmasDay'], ['2026-12-31', 'newYearsEve'], ['2027-01-01', 'newYearsDay'],
  ['2026-11-26', 'thanksgiving'], ['2027-11-25', 'thanksgiving'], ['2026-11-19', undefined], ['2026-11-27', undefined],
  ['2026-10-12', 'thanksgiving'], ['2027-10-11', 'thanksgiving'], ['2026-10-05', undefined], ['2026-10-19', undefined],
  ['2026-12-26', undefined], ['2026-07-04', undefined],
];
for (const [date, holiday] of cases) assert.equal(holidayOn(date), holiday, date);
console.log('holidays: ok');
