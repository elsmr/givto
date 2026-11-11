// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/pick.check.mjs)
import assert from 'node:assert/strict';
import { parseNames, pickNames, randomIndex } from '../lib/pick.ts';

assert.deepEqual(parseNames(' Ann, Bob\n\nCee ,Ann\n  \nDee,,'), ['Ann', 'Bob', 'Cee', 'Dee']);
assert.deepEqual(parseNames(''), []);

const counts = [0, 0, 0];
for (let i = 0; i < 30_000; i++) counts[randomIndex(3)]++;
for (const count of counts) assert.ok(count > 9_400 && count < 10_600, `skewed: ${counts}`);
assert.equal(randomIndex(1), 0);

const picked = pickNames(['Ann', 'Bob', 'Cee', 'Dee'], 3);
assert.equal(picked.length, 3);
assert.equal(new Set(picked).size, 3);
assert.equal(pickNames(['Ann', 'Bob'], 5).length, 2);
assert.deepEqual(pickNames(['Ann'], 0), []);
console.log('pick check ok');
