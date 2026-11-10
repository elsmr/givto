// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/unwrap-turns.check.mjs)
import assert from 'node:assert/strict';
import { backHidesSanta, isLastGift, santaStillHidden, unwrapState } from '../lib/unwrap-turns.ts';

const order = ['ann', 'bob', 'cee'];

/** Plays the presenter: `gifts` = what each person really has; `counts` = what the Santas marked (63). */
const play = (mode, gifts, counts = {}) => {
  const left = { ...gifts };
  const turns = [];
  const shown = [];
  for (let state = unwrapState(order, mode, true, turns, counts); !state.finished; state = unwrapState(order, mode, true, turns, counts)) {
    assert.ok(turns.length < 20, 'runs away');
    const who = state.current;
    left[who]--;
    shown.push(`${who}${state.currentGift}`);
    // Known count: the presenter only says "next", the count decides. Unknown: they say "more" or "last".
    const last = isLastGift(mode, turns, who, counts) || (counts[who] === undefined && left[who] === 0);
    turns.push({ memberId: who, last });
  }
  return { turns: turns.map((t) => t.memberId), shown };
};

// Not started, then the first person.
assert.deepEqual(unwrapState(order, 'oneByOne', false, []), {
  current: null, next: null, round: 1, turn: 1, currentGift: 0, doneIds: [], finished: false,
});
assert.equal(unwrapState(order, 'oneByOne', true, []).current, 'ann');

// oneByOne without counts (today's manual more / last): A 3, B 1, C 2 → A,B,C,A,C,A.
assert.deepEqual(play('oneByOne', { ann: 3, bob: 1, cee: 2 }).turns, ['ann', 'bob', 'cee', 'ann', 'cee', 'ann']);

// With counts: the same order, no "last" needed, "gift 2 of 3".
const counted = play('oneByOne', { ann: 3, bob: 1, cee: 2 }, { ann: 3, bob: 1, cee: 2 });
assert.deepEqual(counted.turns, ['ann', 'bob', 'cee', 'ann', 'cee', 'ann']);
assert.deepEqual(counted.shown, ['ann1', 'bob1', 'cee1', 'ann2', 'cee2', 'ann3']);

// Mixed: Bob's Santa marked nothing (unknown), so Bob falls back to more / last.
assert.deepEqual(play('oneByOne', { ann: 2, bob: 2, cee: 1 }, { ann: 2, cee: 1 }).turns, ['ann', 'bob', 'cee', 'ann', 'bob']);

// Skips people who are done: with B done after 1, `next` from A's 2nd gift is C.
const midway = unwrapState(order, 'oneByOne', true, [{ memberId: 'ann', last: false }, { memberId: 'bob', last: true }, { memberId: 'cee', last: false }], { ann: 3, bob: 1, cee: 2 });
assert.equal(midway.current, 'ann');
assert.equal(midway.currentGift, 2);
assert.equal(midway.next, 'cee');
assert.deepEqual(midway.doneIds, ['bob']);
assert.equal(midway.round, 2);

// `next` leaves out the current person on their last known gift.
const lastOfAnn = unwrapState(order, 'oneByOne', true, [], { ann: 1, bob: 2, cee: 2 });
assert.equal(lastOfAnn.next, 'bob');
const twoLeft = unwrapState(['ann', 'bob'], 'oneByOne', true, [{ memberId: 'ann', last: false }, { memberId: 'bob', last: false }], { ann: 2, bob: 3 });
assert.equal(twoLeft.current, 'ann');
assert.equal(twoLeft.next, 'bob', 'Ann finishes, Bob keeps going');
const oneLeft = unwrapState(['ann', 'bob'], 'oneByOne', true, [{ memberId: 'ann', last: true }, { memberId: 'bob', last: false }], { bob: 3 });
assert.equal(oneLeft.current, 'bob');
assert.equal(oneLeft.next, null, 'only Bob left');

// Ends when everyone is done by count, even without a `last` flag stored (count raised to what was opened).
const byCount = unwrapState(order, 'oneByOne', true, order.map((memberId) => ({ memberId, last: false })), { ann: 1, bob: 1, cee: 1 });
assert.equal(byCount.finished, true);

// allAtOnce: one turn each whatever the counts; the count only shows.
assert.deepEqual(play('allAtOnce', { ann: 3, bob: 1, cee: 2 }, { ann: 3, bob: 1, cee: 2 }).turns, order);
assert.equal(isLastGift('allAtOnce', [], 'ann', { ann: 3 }), true);
assert.equal(isLastGift('oneByOne', [], 'ann', { ann: 3 }), false);
assert.equal(isLastGift('oneByOne', [{ memberId: 'ann', last: false }, { memberId: 'ann', last: false }], 'ann', { ann: 3 }), true);
assert.equal(isLastGift('oneByOne', [], 'ann'), false, 'unknown count: the presenter decides');

// Guess your Santa (62): the Santa is shown once per person, on their first turn; back hides it again there only.
const first = unwrapState(order, 'oneByOne', true, []);
assert.equal(santaStillHidden(first, []), true, "Ann's Santa still to show");
assert.equal(santaStillHidden(first, ['ann']), false);
assert.equal(backHidesSanta(first, [], ['ann']), true, 'back on her first turn hides her Santa');
assert.equal(backHidesSanta(first, [], []), false, 'nothing shown: back undoes as usual');
const annAgain = unwrapState(order, 'oneByOne', true, [{ memberId: 'ann', last: false }, { memberId: 'bob', last: true }, { memberId: 'cee', last: false }]);
assert.equal(annAgain.current, 'ann');
assert.equal(santaStillHidden(annAgain, ['ann', 'bob', 'cee']), false, 'second gift: her Santa is already out');
assert.equal(backHidesSanta(annAgain, [{ memberId: 'ann', last: false }], ['ann']), false, 'later turn: back undoes the turn');
assert.equal(santaStillHidden(unwrapState(order, 'allAtOnce', true, order.map((memberId) => ({ memberId, last: true }))), []), false, 'finished');

console.log('ok  unwrap-turns: more / last by hand, gift counts, skips, rounds, allAtOnce, Santa shown at the turn');
