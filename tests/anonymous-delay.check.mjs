// Run: pnpm test (or node tests/anonymous-delay.check.mjs)
import assert from 'node:assert/strict';
import { anonymousSendAt } from '../lib/anonymous-delay.ts';

const sendAt = (now, timeZone) => anonymousSendAt(new Date(now), timeZone).toISOString();

// Brussels winter (UTC+1): 18:00 local = 17:00Z, same day when there's an hour to spare.
assert.equal(sendAt('2026-12-01T10:00:00Z', 'Europe/Brussels'), '2026-12-01T17:00:00.000Z');
assert.equal(sendAt('2026-12-01T16:00:00Z', 'Europe/Brussels'), '2026-12-01T17:00:00.000Z', 'exactly one hour before');
assert.equal(sendAt('2026-12-01T16:30:00Z', 'Europe/Brussels'), '2026-12-02T17:00:00.000Z', 'less than an hour: next day');
assert.equal(sendAt('2026-12-01T22:30:00Z', 'Europe/Brussels'), '2026-12-02T17:00:00.000Z', 'after 18:00: next day');
// Summer (UTC+2) and the night the clocks go forward.
assert.equal(sendAt('2026-07-01T10:00:00Z', 'Europe/Brussels'), '2026-07-01T16:00:00.000Z');
assert.equal(sendAt('2026-03-28T18:00:00Z', 'Europe/Brussels'), '2026-03-29T16:00:00.000Z', 'DST starts overnight');
assert.equal(sendAt('2026-10-24T20:00:00Z', 'Europe/Brussels'), '2026-10-25T17:00:00.000Z', 'DST ends overnight');
// Month and year rollover, zones far from UTC.
assert.equal(sendAt('2026-12-31T23:30:00Z', 'Europe/Brussels'), '2027-01-01T17:00:00.000Z');
assert.equal(sendAt('2026-12-01T12:00:00Z', 'America/New_York'), '2026-12-01T23:00:00.000Z');
assert.equal(sendAt('2026-12-01T12:00:00Z', 'Pacific/Kiritimati'), '2026-12-02T04:00:00.000Z', 'UTC+14: local date is already the 2nd');
assert.equal(sendAt('2026-12-01T12:00:00Z', 'UTC'), '2026-12-01T18:00:00.000Z');

for (let i = 0; i < 500; i++) {
  const now = new Date(Date.UTC(2026, 0, 1) + Math.floor(Math.random() * 365 * 24 * 60) * 60_000);
  const at = anonymousSendAt(now, 'Europe/Amsterdam');
  const wait = at.getTime() - now.getTime();
  assert.ok(wait >= 60 * 60 * 1000 && wait <= 25 * 60 * 60 * 1000, `${now.toISOString()} → ${at.toISOString()}`);
  const hour = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Amsterdam', hour: 'numeric', hourCycle: 'h23' }).format(at);
  assert.equal(hour, '18');
}

console.log('ok  anonymous delay: 18:00 local, at least 1h later');
