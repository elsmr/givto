import { todayIn } from '../../local-date';
import { isDrawn, type EditionStatus } from '../../schema/edition';
import type { Collections } from '../db';
import { playerIds } from '../draw/rules';
import { newUnwrapOrder, saveResults } from '../edition/status';
import { log } from '../log';
import { saveWishlists } from '../wishlist/wish-view';

/** UTC+14: no edition anywhere reaches its gift day before the local date here. */
const FURTHEST_AHEAD_ZONE = 'Pacific/Kiritimati';

/**
 * Pure (31): the status an edition should have on local date `today` (YYYY-MM-DD, its group's time
 * zone). drawn → giftday on the gift day, → done from the day after (also when a day was missed).
 */
export const giftDayStatus = (status: EditionStatus, giftDay: string, today: string): EditionStatus => {
  if (!isDrawn({ status }) || today < giftDay) return status;
  return today === giftDay ? 'giftday' : 'done';
};

/**
 * Gift day status transitions, by each edition's local date. Idempotent; runs with the scheduled jobs (cron).
 * Entering gift day shuffles the unwrap order if nobody has.
 * `editionIds` (tests only, see JobScope) limits it to those editions, so a test never moves another test's.
 */
export const runGiftDayTransitions = async (db: Collections, now: Date, editionIds?: string[]) => {
  const editions = await db.editions
    .find({
      status: { $in: ['drawn', 'giftday'] },
      'giftDay.date': { $lte: todayIn(FURTHEST_AHEAD_ZONE, now) },
      ...(editionIds && { _id: { $in: editionIds } }),
    })
    .toArray();
  const groups = await db.groups
    .find({ _id: { $in: [...new Set(editions.map((edition) => edition.groupId))] } }, { projection: { timeZone: 1, members: 1 } })
    .toArray();
  const groupsById = new Map(groups.map((group) => [group._id, group]));
  const moved = { giftday: [] as string[], done: [] as string[] };
  for (const edition of editions) {
    const group = groupsById.get(edition.groupId);
    if (!edition.giftDay || !group) continue;
    const next = giftDayStatus(edition.status, edition.giftDay.date, todayIn(group.timeZone, now));
    if ((next !== 'giftday' && next !== 'done') || next === edition.status) continue;
    const players = next === 'giftday' && !edition.unwrapOrder ? playerIds(group, edition) : [];
    const order = players.length > 0 ? { unwrapOrder: newUnwrapOrder(players, now) } : {};
    const changedAt = next === 'giftday' ? { 'statusChangedAt.giftday': now } : { 'statusChangedAt.done': now };
    const result = await db.editions.updateOne(
      { _id: edition._id, status: edition.status },
      { $set: { status: next, ...changedAt, ...order, updatedAt: now } }
    );
    if (result.modifiedCount === 0) continue;
    if (next === 'done') await Promise.all([saveResults(db, edition, now), saveWishlists(db, group, edition)]);
    moved[next].push(edition._id);
  }
  if (moved.giftday.length + moved.done.length > 0) {
    log.info({ giftday: moved.giftday.length, done: moved.done.length }, 'gift day transitions');
  }
  return moved;
};
