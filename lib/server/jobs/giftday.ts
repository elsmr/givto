import { randomInt } from 'node:crypto';
import { shuffle } from '../../draw';
import { editionResults } from '../../guess-results';
import { todayIn } from '../../local-date';
import { isDrawn, type Edition, type EditionStatus } from '../../schema/edition';
import type { Collections } from '../db';
import { playerIds } from '../draw/rules';
import { guessesOf, santaStepOn } from '../guess/guesses';
import { log } from '../log';
import { isRevealed } from '../routers/giftday-view';

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

/** Unwrap order (32): a random order of everyone in the draw, independent of who drew whom. */
export const newUnwrapOrder = (memberIds: string[], now: Date): NonNullable<Edition['unwrapOrder']> => ({
  memberIds: shuffle(memberIds, randomInt),
  shuffledAt: now,
});

/**
 * Champions and badges (86): keeps the scores of `edition` (as it was before done) once done, from only what is out
 * by then: the Santas shown at turns, or everyone with the big reveal on. Finished again after a reopen: written
 * again, unless retention deleted the guesses by then.
 */
export const saveResults = async (db: Collections, edition: Edition, now: Date) => {
  if ((await db.guesses.countDocuments({ editionId: edition._id }, { limit: 1 })) === 0) return;
  const done = { ...edition, status: 'done' as const };
  const assignments = edition.draw?.assignments ?? {};
  const shown = santaStepOn(done) ? (edition.unwrapOrder?.progress?.santaShownIds ?? []) : [];
  const results = editionResults(isRevealed(done) ? Object.keys(assignments) : shown, assignments, await guessesOf(db, done));
  await db.editions.updateOne(
    { _id: edition._id },
    results.points.length > 0 ? { $set: { results: { ...results, savedAt: now } } } : { $unset: { results: true } }
  );
};

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
    if (next === 'done') await saveResults(db, edition, now);
    moved[next].push(edition._id);
  }
  if (moved.giftday.length + moved.done.length > 0) {
    log.info({ giftday: moved.giftday.length, done: moved.done.length }, 'gift day transitions');
  }
  return moved;
};
