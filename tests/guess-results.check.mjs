// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/guess-results.check.mjs)
import assert from 'node:assert/strict';
import { guessResults } from '../lib/guess-results.ts';

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
