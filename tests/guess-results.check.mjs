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
