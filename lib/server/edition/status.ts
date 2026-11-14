import { randomInt } from 'node:crypto';
import { shuffle } from '../../draw';
import { editionResults } from '../../guess-results';
import { todayIn } from '../../local-date';
import { drawsNames, isBeforeDraw, isDrawn, type Edition, type EditionStatus } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Collections } from '../db';
import { playerIds } from '../draw/rules';
import { AppError } from '../errors';
import { isRevealed } from '../giftday/giftday-view';
import { guessesOf, santaStepOn } from '../guess/guesses';
import { saveWishlists } from '../wishlist/wish-view';

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

/** Each action is only offered in its status: another one means it isn't there yet, or it just changed. */
export const wrongStatus = ({ status }: Edition) =>
  new AppError(isBeforeDraw({ status }) ? 'NOT_DRAWN' : status === 'drawn' ? 'NOT_GIFT_DAY' : 'EDITION_CHANGED');

/** Gift day today: a time set for another day no longer applies, the place and call link still do. */
const giftDayToday = ({ giftDay }: Edition, today: string): Edition['giftDay'] => {
  if (giftDay?.date === today) return giftDay;
  const { place, callUrl } = giftDay ?? {};
  return { date: today, ...(place && { place }), ...(callUrl && { callUrl }) };
};

/** Gift day becomes today; deadlines after today move to today (they can't be after gift day). */
const datesToday = (edition: Edition, today: string) => {
  const notAfterToday = (date: string | undefined) => (date && date > today ? today : date);
  const wishlistBy = notAfterToday(edition.wishlistBy);
  const postBy = notAfterToday(edition.postBy);
  return {
    giftDay: giftDayToday(edition, today),
    ...(wishlistBy && { wishlistBy }),
    ...(postBy && { postBy }),
    ...(edition.giftDay?.date !== today && { calendarSequence: (edition.calendarSequence ?? 0) + 1 }),
  };
};

/**
 * drawn → giftday (start now) or done → giftday (reopen until the end of today): gift day becomes
 * today, so the scheduled job keeps it there today and finishes it tomorrow. The unwrap order is
 * shuffled if nobody has.
 */
export const toGiftDayToday = async (db: Collections, group: Group, edition: Edition, from: EditionStatus) => {
  if (edition.status !== from) throw wrongStatus(edition);
  if (drawsNames(edition) && !edition.draw) throw new AppError('NOT_DRAWN');
  const now = new Date();
  const saved = await db.editions.updateOne(
    { _id: edition._id, status: from },
    {
      $set: {
        status: 'giftday',
        'statusChangedAt.giftday': now,
        ...datesToday(edition, todayIn(group.timeZone, now)),
        ...(!edition.unwrapOrder && { unwrapOrder: newUnwrapOrder(playerIds(group, edition), now) }),
        updatedAt: now,
      },
      $unset: { 'statusChangedAt.done': true },
    }
  );
  if (saved.matchedCount === 0) throw new AppError('EDITION_CHANGED');
};

/**
 * drawn or giftday → done now (finish gift day, or before a new edition starts, 77). A gift day
 * still ahead becomes today, so retention and the "what you got" to-do follow the real end.
 */
export const finishEdition = async (db: Collections, group: Group, edition: Edition) => {
  if (!isDrawn(edition)) throw wrongStatus(edition);
  const now = new Date();
  const today = todayIn(group.timeZone, now);
  const saved = await db.editions.updateOne(
    { _id: edition._id, status: edition.status },
    {
      $set: {
        status: 'done',
        'statusChangedAt.done': now,
        ...(edition.giftDay && edition.giftDay.date > today && datesToday(edition, today)),
        updatedAt: now,
      },
    }
  );
  if (saved.matchedCount === 0) throw new AppError('EDITION_CHANGED');
  await Promise.all([saveResults(db, edition, now), saveWishlists(db, group, edition)]);
};
