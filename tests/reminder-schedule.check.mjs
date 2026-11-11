// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/reminder-schedule.check.mjs)
// Plays lib/reminder-schedule.ts day by day (hourly where it matters) and checks who gets what when (63).
import assert from 'node:assert/strict';
import { addDays, daysBetween } from '../lib/local-date.ts';
import { dueReminder, REMINDER_GAP_DAYS } from '../lib/reminder-schedule.ts';

const person = (extra = {}) => ({ joinedOn: '2026-02-01', wishCount: 0, isSanta: false, hasGift: false, hasAddress: false, canDraw: false, everyoneIn: false, ...extra });
const edition = (extra = {}) => ({ status: 'open', giftDay: '2026-12-24', posted: false, ...extra });

/**
 * Ticks `ticksPerDay` times a day from `from` to `to`. `change(day)` may return overrides for that
 * day's person and edition (a wish added, gift marked, names drawn). Returns the emails sent.
 */
const play = ({ who = person(), what = edition(), from = '2026-01-01', to = '2027-01-10', change = () => ({}), ticksPerDay = 1, history = [] }) => {
  const sent = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const { person: p = {}, edition: e = {} } = change(day) ?? {};
    for (let tick = 0; tick < ticksPerDay; tick++) {
      const due = dueReminder({ ...who, ...p }, { ...what, ...e }, history, day);
      if (!due) continue;
      history.push({ sentOn: day, slots: due.slots });
      sent.push({ on: day, parts: due.parts.join('+'), slots: due.slots });
    }
  }
  // Never two within the gap, never one slot twice.
  sent.slice(1).forEach((email, i) => assert.ok(daysBetween(sent[i].on, email.on) >= REMINDER_GAP_DAYS, `gap: ${sent[i].on} → ${email.on}`));
  const slots = sent.flatMap((email) => email.slots);
  assert.equal(new Set(slots).size, slots.length, `a slot twice: ${slots}`);
  return sent;
};
const when = (sent) => sent.map((email) => `${email.on} ${email.parts}`);

// Periodic (14, 28, 42 days after joining) + the last two before gift day; cap: an empty list from
// February means 5 emails, not 20.
assert.deepEqual(when(play({})), [
  '2026-02-15 wishlist', '2026-03-01 wishlist', '2026-03-15 wishlist', '2026-12-10 wishlist', '2026-12-17 wishlist',
]);

// The wishlist deadline, not gift day, when there is one; nothing from the deadline on.
assert.deepEqual(when(play({ what: edition({ wishlistBy: '2026-12-01' }) })), [
  '2026-02-15 wishlist', '2026-03-01 wishlist', '2026-03-15 wishlist', '2026-11-17 wishlist', '2026-11-24 wishlist',
]);
assert.deepEqual(when(play({ what: edition({ wishlistBy: '2026-12-01' }), from: '2026-12-01' })), [], 'nothing from the deadline on');
// A tick missed (job down): the slot still goes out within its week, but not on or after the deadline.
assert.deepEqual(when(play({ what: edition({ wishlistBy: '2026-12-01' }), from: '2026-11-27' })), ['2026-11-27 wishlist']);
assert.deepEqual(when(play({ from: '2026-04-01', to: '2026-11-30' })), [], 'a missed periodic one never comes weeks later');

// Periodic ones stop a week before the last two (Dec 3): joined Nov 10, the 28th day (Dec 8) doesn't fit.
assert.deepEqual(when(play({ who: person({ joinedOn: '2026-11-01' }) })), ['2026-11-15 wishlist', '2026-11-29 wishlist', '2026-12-10 wishlist', '2026-12-17 wishlist']);
assert.deepEqual(when(play({ who: person({ joinedOn: '2026-11-10' }) })), ['2026-11-24 wishlist', '2026-12-10 wishlist', '2026-12-17 wishlist']);
assert.deepEqual(when(play({ who: person({ joinedOn: '2026-11-20' }) })), ['2026-12-10 wishlist', '2026-12-17 wishlist']);

// Late joiners: only the slots after they joined.
assert.deepEqual(when(play({ who: person({ joinedOn: '2026-12-12' }) })), ['2026-12-17 wishlist']);
assert.deepEqual(when(play({ who: person({ joinedOn: '2026-12-17' }) })), [], 'not on the day they joined');

// A wish stops them; deleting it again (Dec 15) brings them back: Dec 10's is still this week's, and
// takes Dec 17's along.
assert.deepEqual(when(play({ change: (day) => (day >= '2026-02-20' && day < '2026-12-15' ? { person: { wishCount: 1 } } : {}) })), [
  '2026-02-15 wishlist', '2026-12-15 wishlist',
]);

// Nothing before the edition is open, nothing from gift day on.
assert.deepEqual(when(play({ what: edition({ status: 'draft' }) })), []);
for (const status of ['giftday', 'done']) assert.deepEqual(when(play({ what: edition({ status }), from: '2026-12-01' })), []);

// Gift reminders: 14 and 7 days before gift day, to Santas; drawn in November.
const drawn = edition({ status: 'drawn', drawnOn: '2026-11-01' });
const santa = person({ wishCount: 2, isSanta: true });
assert.deepEqual(when(play({ who: santa, what: drawn })), ['2026-12-10 gift', '2026-12-17 gift']);
// …before the post-by date when posted.
assert.deepEqual(when(play({ who: santa, what: { ...drawn, postBy: '2026-12-15' } })), ['2026-12-01 gift', '2026-12-08 gift']);
// …not for slots before the draw: drawn 10 days before gift day, only the 7-day one.
assert.deepEqual(when(play({ who: santa, what: { ...drawn, drawnOn: '2026-12-14' } })), ['2026-12-17 gift']);
// Not a Santa (sits out): none.
assert.deepEqual(when(play({ who: { ...santa, isSanta: false }, what: drawn })), []);

// "I've got my gift" stops them; undoing it brings the next one back.
assert.deepEqual(when(play({ who: santa, what: drawn, change: (day) => (day >= '2026-12-01' ? { person: { hasGift: true } } : {}) })), []);
assert.deepEqual(when(play({ who: santa, what: drawn, change: (day) => (day >= '2026-12-11' ? { person: { hasGift: true } } : {}) })), ['2026-12-10 gift']);
assert.deepEqual(
  when(play({ who: santa, what: drawn, change: (day) => (day >= '2026-12-01' && day < '2026-12-17' ? { person: { hasGift: true } } : {}) })),
  ['2026-12-17 gift']
);

// Combine: wishlist and gift due the same day → one email with both parts.
const emptySanta = person({ isSanta: true });
assert.deepEqual(when(play({ who: emptySanta, what: drawn, from: '2026-11-02' })), ['2026-12-10 wishlist+gift', '2026-12-17 wishlist+gift']);
// …or in the same week: the wishlist one (Dec 7) takes the gift one (Dec 10) along; the next gift one is a week later.
assert.deepEqual(when(play({ who: emptySanta, what: { ...drawn, wishlistBy: '2026-12-14' }, from: '2026-11-02' })), [
  '2026-11-30 wishlist', '2026-12-07 wishlist+gift', '2026-12-17 gift',
]);

// The 7-day gap: a wishlist reminder on Feb 15, ready to draw from Feb 18 → the nudge waits until Feb 22.
const organizer = person({ canDraw: true });
assert.deepEqual(
  when(play({ who: organizer, to: '2026-03-10', change: (day) => (day >= '2026-02-18' ? { person: { everyoneIn: true } } : {}) })),
  ['2026-02-15 wishlist', '2026-02-22 readyToDraw', '2026-03-01 wishlist']
);
// Ready to draw: once when everyone's in, once 14 days before gift day if still not drawn, never after the draw.
const listed = person({ canDraw: true, wishCount: 3 });
assert.deepEqual(when(play({ who: listed, change: (day) => (day >= '2026-11-05' ? { person: { everyoneIn: true } } : {}) })), [
  '2026-11-05 readyToDraw', '2026-12-10 readyToDraw',
]);
assert.deepEqual(
  when(play({ who: listed, change: (day) => (day >= '2026-12-01' ? { edition: { status: 'drawn', drawnOn: '2026-12-01' } } : {}) })),
  []
);

// Address (80), posted only: 3 days after joining, then 14 days before the post-by date (else gift day).
const posted = edition({ posted: true });
const listedMember = person({ wishCount: 1 });
assert.deepEqual(when(play({ who: listedMember, what: posted })), ['2026-02-04 address', '2026-12-10 address']);
assert.deepEqual(when(play({ who: listedMember, what: { ...posted, postBy: '2026-12-15' } })), ['2026-02-04 address', '2026-12-01 address']);
assert.deepEqual(when(play({ who: listedMember, what: edition({ postBy: '2026-12-15' }) })), [], 'in person: none');
assert.deepEqual(when(play({ who: { ...listedMember, hasAddress: true }, what: posted })), [], 'none once there is an address');
assert.deepEqual(when(play({ who: listedMember, what: posted, change: (day) => (day >= '2026-02-10' ? { person: { hasAddress: true } } : {}) })), ['2026-02-04 address']);
assert.deepEqual(when(play({ who: { ...listedMember, joinedOn: '2026-12-12' }, what: posted })), ['2026-12-15 address'], 'late joiner');
// …combined with the other parts by the same rules.
assert.deepEqual(when(play({ who: santa, what: { ...drawn, posted: true, postBy: '2026-12-15' } })), ['2026-02-04 address', '2026-12-01 address+gift', '2026-12-08 gift']);
assert.deepEqual(when(play({ who: person(), what: posted })), [
  '2026-02-04 address', '2026-02-15 wishlist', '2026-03-01 wishlist', '2026-03-15 wishlist', '2026-12-10 wishlist+address', '2026-12-17 wishlist',
]);

// No duplicates across ticks: hourly ticks send the same as daily ones.
assert.deepEqual(play({ who: emptySanta, what: drawn, from: '2026-11-02', ticksPerDay: 24 }), play({ who: emptySanta, what: drawn, from: '2026-11-02' }));
// …nor when the date moves after a slot went out: Dec 10's "14 days before" isn't sent again for Dec 31.
const history = [];
play({ who: santa, what: drawn, to: '2026-12-12', history });
assert.deepEqual(when(play({ who: santa, what: { ...drawn, giftDay: '2026-12-31' }, from: '2026-12-13', history })), ['2026-12-24 gift']);
// …and a slot from another edition of the group doesn't count as sent here, but its date does count for the gap.
assert.equal(dueReminder(person(), edition(), [{ sentOn: '2026-12-08', slots: [] }], '2026-12-10'), null);
assert.deepEqual(dueReminder(person(), edition(), [{ sentOn: '2026-12-01', slots: [] }], '2026-12-10'), { parts: ['wishlist'], slots: ['wishlist-14'] });

console.log('ok  reminder-schedule: periodic + last two, deadline vs gift day, late joiners, gap, combine, cap, got my gift, ready to draw, address, no dupes');
