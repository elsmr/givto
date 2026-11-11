// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/guess-results.check.mjs)
import assert from 'node:assert/strict';
import { boardScores, guessResults } from '../lib/guess-results.ts';

// Ann → Bob → Cee → Ann (Santa → giftee); Bob guessed Ann (right), Cee guessed Ann (wrong: Bob), Ann didn't guess.
const assignments = { ann: 'bob', bob: 'cee', cee: 'ann' };
const guesses = { bob: 'ann', cee: 'ann' };

assert.deepEqual(guessResults([], assignments, guesses), [], 'nothing out: no results');
assert.deepEqual(guessResults(['cee'], assignments, guesses), [
  { memberId: 'cee', santaMemberId: 'bob', guessedMemberId: 'ann', right: false },
]);
assert.deepEqual(
  guessResults(['bob', 'ann'], assignments, guesses).map((r) => [r.memberId, r.right, r.guessedMemberId]),
  [['bob', true, 'ann'], ['ann', false, null]],
  'in the order they came out; no guess = not right'
);
assert.deepEqual(guessResults(['dan'], assignments, guesses), [], 'not in the draw (left): skipped');

console.log('ok  guess-results: only what is out, right / wrong / no guess');

// Guess the whole draw (82). Ann → Bob → Cee → Dan → Ann; Ann has no board.
const draw = { ann: 'bob', bob: 'cee', cee: 'dan', dan: 'ann' };
const boards = {
  // Cee is Bob's own giftee: that row is his for free and never scores.
  bob: { bob: 'ann', dan: 'cee', ann: 'dan', cee: 'bob' },
  cee: { cee: 'ann', bob: 'ann' },
  dan: { dan: 'cee' },
};
assert.deepEqual(boardScores([], draw, boards), [], 'nothing out: no leaderboard, not even who played');
assert.deepEqual(boardScores(['bob'], draw, boards), [
  { memberId: 'bob', points: 1 },
  { memberId: 'cee', points: 1 },
  { memberId: 'dan', points: 0 },
]);
assert.deepEqual(boardScores(['bob', 'cee', 'dan', 'ann', 'eve'], draw, boards), [
  { memberId: 'bob', points: 3 },
  { memberId: 'cee', points: 1 },
  { memberId: 'dan', points: 1 },
]);

console.log('ok  board-scores: a point per right pair that is out, own giftee row never scores');

// Champions and badges (86): per group, from the results kept at each edition's done.
const { badgesOf, champions, editionResults } = await import('../lib/guess-results.ts');

assert.deepEqual(editionResults([], draw, boards), { points: [], nailedIds: [], drawSize: 4 }, 'nothing out: nothing kept');
assert.deepEqual(editionResults(['bob', 'cee', 'dan', 'ann'], draw, boards), {
  points: [
    { memberId: 'bob', points: 3 },
    { memberId: 'cee', points: 1 },
    { memberId: 'dan', points: 1 },
  ],
  nailedIds: ['bob', 'dan'],
  drawSize: 4,
});
assert.deepEqual(editionResults(['cee'], draw, boards).nailedIds, [], "only what is out: Dan's own Santa never came out");

assert.deepEqual(champions([{ memberId: 'a', points: 2 }, { memberId: 'b', points: 2 }, { memberId: 'c', points: 1 }]), ['a', 'b'], 'shared');
assert.deepEqual(champions([{ memberId: 'a', points: 0 }, { memberId: 'b', points: 0 }]), [], 'nobody at 0');
assert.deepEqual(champions([]), []);

const points = (entries) => Object.entries(entries).map(([memberId, p]) => ({ memberId, points: p }));
const badges = badgesOf([
  // 5 isn't done yet; 3 had guessing off, so Ann's wins in 2 and 4 aren't back to back.
  { number: 5 },
  { number: 4, results: { points: points({ ann: 3, bob: 3, cee: 1 }), nailedIds: ['bob'], drawSize: 4 } },
  { number: 3 },
  { number: 2, results: { points: points({ ann: 2, bob: 1 }), nailedIds: ['ann', 'bob'], drawSize: 3 } },
  { number: 1, results: { points: points({ ann: 1, cee: 1 }), nailedIds: [], drawSize: 3 } },
]);
assert.deepEqual(badges, {
  ann: [
    { kind: 'champion', count: 3 },
    { kind: 'backToBack', count: 1 },
    { kind: 'perfect', count: 2 },
    { kind: 'nailed', count: 1 },
  ],
  bob: [
    { kind: 'champion', count: 1 },
    { kind: 'perfect', count: 1 },
    { kind: 'nailed', count: 2 },
  ],
  cee: [{ kind: 'champion', count: 1 }],
});

console.log('ok  champions + badges: shared titles, none at 0, back to back only in consecutive editions');
