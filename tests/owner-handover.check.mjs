// Run: pnpm test (or node --import ./tests/ts-hooks.mjs tests/owner-handover.check.mjs)
import assert from 'node:assert/strict';
import { groupWithout } from '../lib/server/account/delete.ts';

const now = new Date('2026-01-01');
const at = (day) => new Date(`2025-01-0${day}`);
const person = (id, role, joinedAt, extra = {}) => ({ id, userId: id, name: id, role, status: 'joined', joinedAt, wishlistView: { shownWishIds: [] }, ...extra });
const group = {
  _id: 'g', locale: 'en', createdBy: 'owner', households: [], updatedAt: at(1),
  members: [
    person('owner', 'owner', at(1)),
    person('early', 'member', at(2)),
    person('org', 'organizer', at(3)),
    { id: 'kid', name: 'Kid', role: 'member', status: 'joined', managedBy: 'owner', wishlistView: { shownWishIds: [] } },
    { id: 'kid2', name: 'Kid 2', role: 'member', status: 'joined', managedBy: 'org', wishlistView: { shownWishIds: [] } },
  ],
};
const role = (g, id) => g.members.find((m) => m.id === id).role;
const managedBy = (g, id) => g.members.find((m) => m.id === id).managedBy;

const ownerGone = groupWithout(group, 'owner', now);
assert.equal(role(ownerGone, 'org'), 'owner', 'an organizer comes before a longer-joined member');
assert.equal(role(ownerGone, 'early'), 'member');
assert.equal(managedBy(ownerGone, 'kid'), 'org');
assert.equal(ownerGone.createdBy, 'org');
assert.deepEqual(ownerGone.organizerHandover, { toMemberId: 'org', at: now });

const noOrganizer = groupWithout({ ...group, members: group.members.filter((m) => m.id !== 'org') }, 'owner', now);
assert.equal(role(noOrganizer, 'early'), 'owner', 'without organizers the longest-joined member');

const organizerGone = groupWithout(group, 'org', now);
assert.equal(role(organizerGone, 'owner'), 'owner');
assert.equal(managedBy(organizerGone, 'kid2'), 'owner', "an organizer's managed members go to the owner");
assert.equal(organizerGone.organizerHandover, undefined);
assert.equal(organizerGone.createdBy, 'owner');
console.log('owner-handover check ok');
