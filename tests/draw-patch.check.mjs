// Run: pnpm test (or node tests/draw-patch.check.mjs)
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { changedSantas, slotIn, takeOut } from '../lib/draw-patch.ts';

const isValid = (assignments, exclusions = []) => {
  const ids = Object.keys(assignments);
  return (
    ids.every((santa) => assignments[santa] !== santa) &&
    new Set(Object.values(assignments)).size === ids.length &&
    Object.values(assignments).every((giftee) => ids.includes(giftee)) &&
    exclusions.every(({ from, to }) => assignments[from] !== to)
  );
};

const cycle = { ann: 'bob', bob: 'cee', cee: 'dan', dan: 'ann' };

// Slot in: only one Santa's giftee changes, and the joiner gives to their old giftee.
for (let i = 0; i < 200; i++) {
  const next = slotIn(cycle, 'eve', [], randomInt);
  assert.ok(isValid(next));
  const changed = changedSantas(cycle, next).filter((santa) => santa !== 'eve');
  assert.equal(changed.length, 1);
  assert.equal(next[changed[0]], 'eve');
  assert.equal(next.eve, cycle[changed[0]]);
}
// Slot in respects exclusions: Eve may only give to Dan, so Dan's Santa (Cee) is the only fit.
const slotRules = [{ from: 'eve', to: 'bob' }, { from: 'eve', to: 'cee' }, { from: 'eve', to: 'ann' }];
for (let i = 0; i < 50; i++) {
  const next = slotIn(cycle, 'eve', slotRules, randomInt);
  assert.deepEqual(next, { ...cycle, cee: 'eve', eve: 'dan' });
}
// Nobody fits: Eve may give to nobody.
assert.equal(slotIn(cycle, 'eve', ['ann', 'bob', 'cee', 'dan'].map((to) => ({ from: 'eve', to })), randomInt), null);

// Take out: A→leaver→B becomes A→B, nobody else changes.
const without = takeOut(cycle, 'cee', [], randomInt);
assert.deepEqual(without, { ann: 'bob', bob: 'dan', dan: 'ann' });
assert.deepEqual(changedSantas(cycle, without), ['bob']);
// A→B excluded: one swap, two Santas change, still valid.
const five = { ann: 'bob', bob: 'cee', cee: 'dan', dan: 'eve', eve: 'ann' };
const bobDan = [{ from: 'bob', to: 'dan' }];
for (let i = 0; i < 50; i++) {
  const next = takeOut(five, 'cee', bobDan, randomInt);
  assert.ok(isValid(next, bobDan), JSON.stringify(next));
  assert.equal(changedSantas(five, next).length, 2);
}
// Mutual pair: Ann↔Bob, Cee→Dan→Eve→Cee. Bob leaves → Ann would give to herself → swap.
const pairs = { ann: 'bob', bob: 'ann', cee: 'dan', dan: 'eve', eve: 'cee' };
for (let i = 0; i < 50; i++) {
  const next = takeOut(pairs, 'bob', [], randomInt);
  assert.ok(isValid(next), JSON.stringify(next));
  assert.equal(changedSantas(pairs, next).length, 2);
}
// One swap isn't enough (all three would change): the caller re-draws.
assert.equal(takeOut(cycle, 'cee', bobDan, randomInt), null);
// No swap possible: two people left who may not give to each other.
assert.equal(takeOut({ ann: 'bob', bob: 'cee', cee: 'ann' }, 'cee', [{ from: 'bob', to: 'ann' }], randomInt), null);
// Not in the draw: unchanged.
assert.equal(takeOut(cycle, 'zed', [], randomInt), cycle);

console.log('draw-patch: ok');
