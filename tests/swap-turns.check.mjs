// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/swap-turns.check.mjs)
import assert from 'node:assert/strict';
import { canMove, swapState } from '../lib/swap-turns.ts';

const order = ['ann', 'bob', 'cee', 'dan'];

/** Plays the presenter: each step is [action, giftNo?], made by whoever is up; refuses illegal ones like the server. */
const play = (steps, players = order) =>
  steps.reduce((moves, [action, giftNo]) => {
    const state = swapState(players, true, moves);
    assert.ok(canMove(state, action, giftNo), `${state.current} may not ${action} ${giftNo ?? ''} after ${JSON.stringify(moves)}`);
    return [...moves, { memberId: state.current, action, ...(giftNo && { giftNo }) }];
  }, []);
const holders = (state) => Object.fromEntries(state.gifts.map((gift) => [gift.no, gift.holderId]));

// Not started, then the first player can only open.
assert.equal(swapState(order, false, []).current, null);
const first = swapState(order, true, []);
assert.equal(first.current, 'ann');
assert.deepEqual(first.stealable, []);
assert.equal(canMove(first, 'steal', 1), false);
assert.equal(canMove(first, 'keep'), false);

// Bob steals Ann's gift: Ann goes next, can't take it straight back, opens a new one; then the turn moves on to Cee.
const stolen = swapState(order, true, play([['open'], ['steal', 1]]));
assert.equal(stolen.current, 'ann');
assert.equal(stolen.robbed, true);
assert.deepEqual(stolen.stealable, []);
assert.equal(canMove(stolen, 'steal', 1), false);
const moved = swapState(order, true, play([['open'], ['steal', 1], ['open']]));
assert.equal(moved.current, 'cee');
assert.equal(moved.robbed, false);
assert.deepEqual(holders(moved), { 1: 'bob', 2: 'ann' });
assert.deepEqual(moved.doneIds, ['ann', 'bob']);

// A chain: the victim steals from someone else, who goes next; a later steal-back is fine.
const chain = swapState(order, true, play([['open'], ['open'], ['steal', 1], ['steal', 2]]));
assert.equal(chain.current, 'bob');
assert.deepEqual(chain.stealable, [1]);

// The third steal freezes a gift: nobody may take it any more, and it's not on offer at the final steal.
const freeze = [['open'], ['steal', 1], ['open'], ['steal', 1], ['open'], ['steal', 1]];
const frozen = swapState(order, true, play(freeze));
assert.equal(frozen.current, 'cee');
assert.deepEqual(frozen.gifts[0], { no: 1, label: null, holderId: 'dan', steals: 3, frozen: true });
assert.deepEqual(frozen.stealable, [2, 3]);
assert.equal(canMove(frozen, 'steal', 1), false);

// After the last open the first player gets the final steal: swap with an unfrozen gift, or keep theirs; then it ends.
const allOpen = play([...freeze, ['open']]);
const final = swapState(order, true, allOpen);
assert.equal(final.final, true);
assert.equal(final.current, 'ann');
assert.equal(final.wrapped, 0);
assert.equal(canMove(final, 'open'), false);
assert.deepEqual(final.stealable, [3, 4]);
assert.deepEqual(holders(final), { 1: 'dan', 2: 'ann', 3: 'bob', 4: 'cee' });
const swapped = swapState(order, true, play([...freeze, ['open'], ['steal', 4]]));
assert.equal(swapped.finished, true);
assert.equal(swapped.current, null);
assert.deepEqual(holders(swapped), { 1: 'dan', 2: 'cee', 3: 'bob', 4: 'ann' });
assert.deepEqual(swapped.doneIds, order);
assert.equal(swapState(order, true, play([...freeze, ['open'], ['keep']])).finished, true);
assert.equal(canMove(swapped, 'keep'), false);

// Everyone ends up with one gift.
assert.equal(new Set(Object.values(holders(swapped))).size, order.length);
assert.equal(swapped.gifts.length, order.length);

// A label the presenter typed stays with the gift as it moves.
const labelled = swapState(order, true, [{ memberId: 'ann', action: 'open', giftNo: 1, label: 'Red scarf' }, { memberId: 'bob', action: 'steal', giftNo: 1 }]);
assert.deepEqual(labelled.gifts[0], { no: 1, label: 'Red scarf', holderId: 'bob', steals: 1, frozen: false });

// Someone leaves mid-swap: nobody still in it loses their turn, and the final steal waits for everyone.
const left = ['bob', 'cee', 'dan'];
const afterLeave = swapState(left, true, play([['open'], ['open']]));
assert.equal(afterLeave.current, 'cee');
assert.equal(afterLeave.wrapped, 2);
assert.equal(swapState(left, true, play([['open'], ['open']]).concat({ memberId: 'cee', action: 'open' })).current, 'dan');
const robbedLeft = swapState(left, true, play([['open'], ['steal', 1]]));
assert.equal(robbedLeft.current, 'cee');
assert.equal(robbedLeft.robbed, false);
assert.equal(robbedLeft.wrapped, 2);

console.log('swap-turns: ok');
