// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/shown-wish-ids.check.mjs)
import assert from 'node:assert/strict';
import { withShownWishIds } from '../migrations/002-shown-wish-ids.ts';

const wishIdsOf = new Map([
  ['ann', ['a1', 'a2', 'a3']],
  ['kid', ['k1']],
]);
const group = {
  _id: 'g',
  members: [
    { id: 'm1', userId: 'ann', wishlistView: { includeNewWishes: false, hiddenWishIds: ['a2'] } },
    { id: 'm2', userId: 'bob', wishlistView: { includeNewWishes: true, hiddenWishIds: [] } },
    { id: 'kid', managedBy: 'm1', wishlistView: { includeNewWishes: true, hiddenWishIds: [] } },
    { id: 'm3', name: 'Invitee' },
  ],
};

const members = withShownWishIds(group, wishIdsOf);
assert.deepEqual(
  members.map((m) => m.wishlistView),
  [{ shownWishIds: ['a1', 'a3'] }, { shownWishIds: [] }, { shownWishIds: [] }, { shownWishIds: [] }]
);
assert.equal(withShownWishIds({ ...group, members }, wishIdsOf), null, 'a second run changes nothing');

const partly = { _id: 'g', members: [members[0], group.members[1]] };
assert.deepEqual(withShownWishIds(partly, wishIdsOf)[0], members[0], 'migrated members stay as they are');
console.log('shown-wish-ids check ok');
