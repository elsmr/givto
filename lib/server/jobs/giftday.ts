import { randomInt } from 'node:crypto';
import { shuffle } from '../../draw';
import { todayIn } from '../../local-date';
import { isDrawn, type Edition, type EditionStatus } from '../../schema/edition';
import type { Collections } from '../db';
import { log } from '../log';

/** UTC+14: no edition anywhere reaches its gift day before the local date here. */
const FURTHEST_AHEAD_ZONE = 'Pacific/Kiritimati';

/**
 * Pure (31): the status an edition should have on local date `today` (YYYY-MM-DD, its own time
 * zone). drawn → giftday on the gift day, → done from the day after (also when a day was missed).
 */
export const giftDayStatus = (status: EditionStatus, giftDay: string, today: string): EditionStatus => {
  if (!isDrawn({ status }) || today < giftDay) return status;
  return today === giftDay ? 'giftday' : 'done';
};

/** Unwrap order (32): a random order of everyone in the draw, independent of who drew whom. */
export const newUnwrapOrder = (memberIds: string[], now: Date): NonNullable<Edition['unwrapOrder']> => ({
  memberIds: shuffle(memberIds, randomInt),
  shuffledAt: now,
});

/**
 * Gift day status transitions, by each edition's local date. Idempotent; runs with the scheduled jobs (cron) or
 * via the test trigger `giftday.runDue`. Entering gift day shuffles the unwrap order if nobody has.
 * `editionIds` (test trigger only) limits it to those editions, so a test never moves another test's.
 */
export const runGiftDayTransitions = async (db: Collections, now: Date, editionIds?: string[]) => {
  const editions = await db.editions
    .find({
      status: { $in: ['drawn', 'giftday'] },
      'giftDay.date': { $lte: todayIn(FURTHEST_AHEAD_ZONE, now) },
      ...(editionIds && { _id: { $in: editionIds } }),
    })
    .toArray();
  const moved = { giftday: [] as string[], done: [] as string[] };
  for (const edition of editions) {
    if (!edition.giftDay) continue;
    const next = giftDayStatus(edition.status, edition.giftDay.date, todayIn(edition.timeZone, now));
    if ((next !== 'giftday' && next !== 'done') || next === edition.status) continue;
    const order =
      next === 'giftday' && !edition.unwrapOrder && edition.draw
        ? { unwrapOrder: newUnwrapOrder(Object.keys(edition.draw.assignments), now) }
        : {};
    const changedAt = next === 'giftday' ? { 'statusChangedAt.giftday': now } : { 'statusChangedAt.done': now };
    const result = await db.editions.updateOne(
      { _id: edition._id, status: edition.status },
      { $set: { status: next, ...changedAt, ...order, updatedAt: now } }
    );
    if (result.modifiedCount > 0) moved[next].push(edition._id);
  }
  if (moved.giftday.length + moved.done.length > 0) {
    log.info({ giftday: moved.giftday.length, done: moved.done.length }, 'gift day transitions');
  }
  return moved;
};
