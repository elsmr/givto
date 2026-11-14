// Migration 005 (100): editions that were already done when migration 001 moved the old app's data get their
// wishlists from the old groups (v1_groups): each person's list as that group had it, with the old wording. Only
// editions 001 created as done that have no wishlists yet; people who deleted their account since, and wishes their
// owner deleted since, stay out. Editions 001 created as drawn or open and finished later are left alone.
import type { Db } from 'mongodb';
import * as v from 'valibot';
import { Edition, type SavedWish } from '../lib/schema/edition';
import type { Group } from '../lib/schema/group';
import type { Wish } from '../lib/schema/wish';
import { readTarget, type MigrationReport } from './001-v1-to-v2';
import { derivedId } from './v1-to-v2/clean';
import { planV1ToV2, type Plan, type V1Group, type V1User } from './v1-to-v2/plan';

export const id = '005-v1-wishlists';

const toSaved = ({ _id, ownerId: _o, position: _p, receivedAt: _r, archivedAt: _a, createdAt: _c, updatedAt: _u, ...fields }: Wish): SavedWish => ({
  id: _id,
  ...fields,
});

/** One migrated done edition's wishlists from the replayed plan, and who was left out and why. */
export const editionWishlists = (plan: Plan, group: Group, edition: Edition, liveWishIds: Set<string>) => {
  const planned = plan.groups.find((g) => g._id === group._id);
  const wishById = new Map(plan.wishes.map((wish) => [wish._id, wish]));
  const players = edition.draw
    ? Object.keys(edition.draw.assignments)
    : edition.participants.filter((p) => p.participates).map((p) => p.memberId);
  const left = { deletedAccount: 0, unmatched: 0, deletedWishes: 0 };
  const wishlists = players.flatMap((memberId) => {
    const member = group.members.find((m) => m.id === memberId);
    const old = planned?.members.find((m) => m.id === memberId);
    if (member && !member.userId && !member.managedBy) {
      left.deletedAccount++;
      return [];
    }
    // The replay must land on the same person 001 made: otherwise their list stays out.
    if (!member || !old || old.userId !== member.userId) {
      left.unmatched++;
      return [];
    }
    const ids = plan.lists.get(`${group._id}:${old.userId ?? old.id}`) ?? [];
    const kept = ids.filter((wishId) => liveWishIds.has(wishId) && wishById.has(wishId));
    left.deletedWishes += ids.length - kept.length;
    return [{ memberId, wishes: kept.map((wishId) => toSaved(wishById.get(wishId)!)) }];
  });
  return { wishlists, left };
};

export const up = async (db: Db, { apply, now = new Date() }: { apply: boolean; now?: Date }): Promise<MigrationReport> => {
  const empty: MigrationReport = { source: {}, planned: {}, conflicts: {}, invalid: [], samples: {} };
  const migrated = await db.collection<{ _id: string; appliedAt: Date }>('migrations').findOne({ _id: '001-v1-to-v2' });
  if (!migrated) return empty;
  const candidates = (
    await db.collection<Edition>('editions').find({ number: 1, status: 'done', wishlists: { $exists: false } }).toArray()
  ).filter((edition) => edition._id === derivedId('edition', edition.groupId, '1'));
  const doneAtMigration = (edition: Edition) => (edition.statusChangedAt.done?.getTime() ?? Infinity) <= migrated.appliedAt.getTime();
  const editions = candidates.filter(doneAtMigration);
  const finishedLater = candidates.filter((edition) => !doneAtMigration(edition));

  const [users, oldGroups, groups] = await Promise.all([
    db.collection<V1User>('v1_users').find().toArray(),
    db.collection<V1Group>('v1_groups').find().toArray(),
    db.collection<Group>('groups').find({ _id: { $in: editions.map((edition) => edition.groupId) } }).toArray(),
  ]);
  const plan = planV1ToV2({ users, groups: oldGroups }, await readTarget(db, users, oldGroups), now);
  const plannedIds = [...new Set([...plan.lists.values()].flat())];
  const liveWishIds = new Set(
    (await db.collection<Wish>('wishes').find({ _id: { $in: plannedIds } }, { projection: { _id: 1 } }).toArray()).map((wish) => wish._id)
  );

  const groupById = new Map(groups.map((group) => [group._id, group]));
  const changes = editions.flatMap((edition) => {
    const group = groupById.get(edition.groupId);
    return group ? [{ _id: edition._id, ...editionWishlists(plan, group, edition, liveWishIds) }] : [];
  });
  const total = (key: keyof (typeof changes)[number]['left']) => changes.reduce((sum, change) => sum + change.left[key], 0);
  const counted = (count: number, samples: unknown[] = []) => ({ count, samples });
  const report: MigrationReport = {
    source: { doneAtMigration: editions.length, oldGroups: oldGroups.length },
    planned: {
      editions: changes.length,
      wishlists: changes.reduce((sum, change) => sum + change.wishlists.length, 0),
      wishes: changes.reduce((sum, change) => sum + change.wishlists.reduce((n, list) => n + list.wishes.length, 0), 0),
    },
    conflicts: {
      finishedAfterMigration: counted(finishedLater.length, finishedLater.slice(0, 5).map((edition) => edition._id)),
      deletedAccount: counted(total('deletedAccount')),
      unmatchedPerson: counted(total('unmatched')),
      deletedWish: counted(total('deletedWishes')),
    },
    invalid: changes.flatMap(({ _id, wishlists }) => {
      const result = v.safeParse(Edition.entries.wishlists, wishlists);
      return result.success ? [] : [{ collection: 'editions', id: _id, issues: result.issues.slice(0, 3).map((i) => `${v.getDotPath(i) ?? ''}: ${i.message}`) }];
    }),
    // Counts only: wish titles are personal data.
    samples: { edition: changes[0] && { _id: changes[0]._id, wishesPerList: changes[0].wishlists.map((list) => list.wishes.length) } },
  };
  if (!apply || changes.length === 0) return report;
  if (report.invalid.length > 0) throw new Error(`${report.invalid.length} editions' wishlists fail the schema (run without --apply to see them). Nothing written.`);
  const ops = changes.map(({ _id, wishlists }) => ({
    updateOne: { filter: { _id, wishlists: { $exists: false } }, update: { $set: { wishlists } } },
  }));
  const written = (await db.collection<Edition>('editions').bulkWrite(ops, { ordered: false })).modifiedCount;
  return { ...report, written: { editions: written } };
};
