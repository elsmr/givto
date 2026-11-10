// Run: pnpm test (or node tests/exclusions.check.mjs)
import assert from 'node:assert/strict';
import { findStuckGivers } from '../lib/draw.ts';
import { toExclusions, toKeepApartPairs } from '../lib/exclusions.ts';

const ids = ['ann', 'bob', 'cee', 'dan'];

const family = toExclusions([['ann', 'bob', 'cee']]);
assert.equal(family.length, 6);
assert.deepEqual(findStuckGivers(ids, family)?.receivers, ['dan']);

const couples = toExclusions([['ann', 'bob'], ['cee', 'dan']]);
assert.equal(findStuckGivers(ids, couples), null);

const overlapping = toExclusions([['ann', 'bob'], ['bob', 'cee']]);
assert.deepEqual(overlapping, [
  { from: 'ann', to: 'bob' }, { from: 'bob', to: 'ann' }, { from: 'bob', to: 'cee' }, { from: 'cee', to: 'bob' },
]);
assert.equal(findStuckGivers(ids, overlapping), null);
assert.equal(findStuckGivers(['ann', 'bob'], toExclusions([['ann', 'bob']]))?.givers[0], 'ann');

const olderPair = [{ from: 'ann', to: 'dan' }, { from: 'dan', to: 'ann' }];
assert.deepEqual(toKeepApartPairs(olderPair), [['ann', 'dan']]);
assert.deepEqual(toKeepApartPairs([{ from: 'ann', to: 'bob' }]), []);

console.log('exclusions check ok');
