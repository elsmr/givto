// Run: node lib/api/util/secret-santa.check.mjs
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { drawAssignments, findStuckGivers } from './secret-santa.util.ts';

const bothWays = (pairs) => pairs.flatMap(([from, to]) => [{ from, to }, { from: to, to: from }]);
const isValid = (ids, exclusions, assignments) =>
  ids.every((g) => assignments[g] !== g) &&
  new Set(Object.values(assignments)).size === ids.length &&
  exclusions.every(({ from, to }) => assignments[from] !== to);

// Impossible: Ann, Bob and Cee all exclude each other, so they can only give to Dan.
// Any subset of 2+ of them is already a valid answer (more givers than receivers).
const abcd = ['ann', 'bob', 'cee', 'dan'];
const stuck = findStuckGivers(abcd, bothWays([['ann', 'bob'], ['ann', 'cee'], ['bob', 'cee']]));
assert.deepEqual(stuck.receivers, ['dan']);
assert.ok(stuck.givers.length >= 2 && stuck.givers.every((g) => ['ann', 'bob', 'cee'].includes(g)), stuck.givers);
assert.deepEqual(findStuckGivers(['ann', 'bob'], bothWays([['ann', 'bob']])), { givers: ['ann'], receivers: [] });
assert.deepEqual(findStuckGivers(['ann'], []), { givers: ['ann'], receivers: [] });

// 3 households of 4: nobody gives within their household.
const people = [...Array(12).keys()].map(String);
const households = people.flatMap((a) => people.filter((b) => a < b && Math.floor(a / 4) === Math.floor(b / 4)).map((b) => [a, b]));
const householdExclusions = bothWays(households);
assert.equal(findStuckGivers(people, householdExclusions), null);
assert.ok(isValid(people, householdExclusions, drawAssignments(people, householdExclusions, randomInt)));

// Directed: ann may not give to bob, but bob may give to ann.
for (let i = 0; i < 100; i++) {
  assert.notEqual(drawAssignments(['ann', 'bob', 'cee'], [{ from: 'ann', to: 'bob' }], randomInt).ann, 'bob');
}

// Swap fallback: only the cycle 0→1→…→9→0 is allowed, so rejection sampling (1 in 10!) gives up.
const ten = [...Array(10).keys()].map(String);
const onlyCycle = ten.flatMap((g, i) => ten.filter((r) => r !== g && r !== ten[(i + 1) % 10]).map((r) => ({ from: g, to: r })));
assert.deepEqual(drawAssignments(ten, onlyCycle, randomInt), Object.fromEntries(ten.map((g, i) => [g, ten[(i + 1) % 10]])));
assert.throws(() => drawAssignments(['ann', 'bob'], bothWays([['ann', 'bob']]), randomInt));

// Uniform: 4 people have 9 valid draws, each should appear ~1111 times in 10k draws (σ ≈ 31).
// `sabotaged` shuffles move at most 2 people, so every shuffle fails and the swap fallback runs.
const sabotaged = (max) => (max < abcd.length ? max - 1 : randomInt(max));
const results = [randomInt, sabotaged].map((random) => {
  const counts = new Map();
  for (let i = 0; i < 10_000; i++) {
    const assignments = drawAssignments(abcd, [], random);
    assert.ok(isValid(abcd, [], assignments), JSON.stringify(assignments));
    const key = abcd.map((g) => assignments[g]).join();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  assert.equal(counts.size, 9);
  for (const count of counts.values()) assert.ok(Math.abs(count - 10_000 / 9) < 200, `skewed: ${[...counts.values()]}`);
  return [...counts.values()].join(' ');
});

console.log(`ok  secret-santa\n    shuffle draws:  ${results[0]}\n    fallback draws: ${results[1]}`);
