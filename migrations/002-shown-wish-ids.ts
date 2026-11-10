// Migration 002: a group's wishlist view turns from a blocklist (hiddenWishIds, includeNewWishes)
// into an allowlist (shownWishIds), so a new wish shows in no group until the owner picks one.
// Every group keeps seeing exactly what it saw before.
import type { Db } from 'mongodb';
import type { MigrationReport } from './001-v1-to-v2';

export const id = '002-shown-wish-ids';

type OldMember = { id: string; userId?: string; wishlistView?: { shownWishIds?: string[]; hiddenWishIds?: string[] } };
type OldGroup = { _id: string; members: OldMember[] };

/**
 * The group's members with `wishlistView: { shownWishIds }`, or null when every member already has one.
 * Archived and received wishes count as shown (unless hidden), so a restore behaves as before. Members
 * without an account show nothing: managed members' groups ignore the list, invitees start empty.
 */
export const withShownWishIds = (group: OldGroup, wishIdsOf: Map<string, string[]>): OldMember[] | null => {
  if (group.members.every((m) => Array.isArray(m.wishlistView?.shownWishIds))) return null;
  return group.members.map((m) => {
    if (Array.isArray(m.wishlistView?.shownWishIds)) return m;
    const hidden = new Set(m.wishlistView?.hiddenWishIds ?? []);
    const shownWishIds = m.userId ? (wishIdsOf.get(m.userId) ?? []).filter((wishId) => !hidden.has(wishId)) : [];
    return { ...m, wishlistView: { shownWishIds } };
  });
};

export const up = async (db: Db, { apply }: { apply: boolean; now?: Date }): Promise<MigrationReport> => {
  const groups = await db.collection<OldGroup>('groups').find({ members: { $exists: true } }).toArray();
  const wishes = await db.collection<{ _id: string; ownerId: string }>('wishes').find({}, { projection: { ownerId: 1 } }).sort({ position: 1, _id: 1 }).toArray();
  const wishIdsOf = new Map([...Map.groupBy(wishes, (wish) => wish.ownerId)].map(([ownerId, owned]) => [ownerId, owned.map((wish) => wish._id)]));
  const changes = groups.flatMap((group) => {
    const members = withShownWishIds(group, wishIdsOf);
    return members ? [{ _id: group._id, members }] : [];
  });
  const report: MigrationReport = {
    source: { groups: groups.length, wishes: wishes.length },
    planned: { groups: changes.length, members: changes.reduce((sum, change) => sum + change.members.length, 0) },
    conflicts: {},
    invalid: [],
    samples: { group: changes[0] },
  };
  if (!apply) return report;
  const ops = changes.map(({ _id, members }) => ({ updateOne: { filter: { _id }, update: { $set: { members } } } }));
  const written = ops.length === 0 ? 0 : (await db.collection<OldGroup>('groups').bulkWrite(ops, { ordered: false })).modifiedCount;
  return { ...report, written: { groups: written } };
};
