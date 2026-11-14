// Run: pnpm test (or node tests/exclusions.check.mjs)
import assert from 'node:assert/strict';
import { findStuckGivers } from '../lib/draw.ts';
import { toExclusions } from '../lib/exclusions.ts';
import { withPairRows } from '../migrations/004-keep-apart-rows.ts';

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

const ids4 = ['r1', 'r2'].values();
const older = withPairRows(
  {
    households: [{ id: 'h', memberIds: ['bob', 'cee', 'eve'] }],
    exclusions: [
      { from: 'ann', to: 'dan' }, { from: 'dan', to: 'ann' },
      { from: 'bob', to: 'cee' }, { from: 'cee', to: 'bob' },
      { from: 'ann', to: 'bob' },
    ],
  },
  () => ids4.next().value
);
assert.deepEqual(older.households.map((h) => h.memberIds), [['bob', 'cee', 'eve'], ['ann', 'dan']], 'pairs become rows unless a row covers them');
assert.deepEqual(older.oneWay, [{ from: 'ann', to: 'bob' }]);
assert.deepEqual(withPairRows({ households: [] }, () => 'x'), { households: [], oneWay: [] });

console.log('exclusions check ok');
