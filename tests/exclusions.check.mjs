// Run: pnpm test (or node tests/exclusions.check.mjs)
import assert from 'node:assert/strict';
import { findStuckGivers } from '../lib/draw.ts';
import { toExclusions, toKeepApartPairs } from '../lib/exclusions.ts';

const ids = ['ann', 'bob', 'cee', 'dan'];

const household = toExclusions([['ann', 'bob', 'cee']], []);
assert.equal(household.length, 6);
assert.deepEqual(findStuckGivers(ids, household)?.receivers, ['dan']);

const couples = toExclusions([['ann', 'bob'], ['cee', 'dan']], []);
assert.equal(findStuckGivers(ids, couples), null);

const pairs = toExclusions([], [['ann', 'dan']]);
assert.deepEqual(pairs, [{ from: 'ann', to: 'dan' }, { from: 'dan', to: 'ann' }]);
assert.deepEqual(toKeepApartPairs(pairs), [['ann', 'dan']]);
assert.deepEqual(toKeepApartPairs([{ from: 'ann', to: 'bob' }]), []);
assert.equal(findStuckGivers(['ann', 'bob'], toExclusions([], [['ann', 'bob']]))?.givers[0], 'ann');

console.log('exclusions check ok');
