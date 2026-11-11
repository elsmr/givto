import * as v from 'valibot';
import { todayIn } from '../../local-date';
import { LocalDate } from '../../schema/common';
import { drawsNames, isBeforeDraw, isDrawn, type Edition, type EditionStatus } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Collections } from '../db';
import { playerIds } from '../draw/rules';
import { AppError } from '../errors';
import { newUnwrapOrder, saveResults } from '../jobs/giftday';
import { currentEdition } from '../membership';
import { organizerEditionProcedure, router } from '../trpc';

/** Each action is only offered in its status: another one means it isn't there yet, or it just changed. */
const wrongStatus = ({ status }: Edition) =>
  new AppError(isBeforeDraw({ status }) ? 'NOT_DRAWN' : status === 'drawn' ? 'NOT_GIFT_DAY' : 'EDITION_CHANGED');

/** Gift day today: a time set for another day no longer applies, the place still does. */
const giftDayToday = (edition: Edition, today: string): Edition['giftDay'] =>
  edition.giftDay?.date === today ? edition.giftDay : { date: today, ...(edition.giftDay?.place && { place: edition.giftDay.place }) };

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
const toGiftDayToday = async (db: Collections, group: Group, edition: Edition, from: EditionStatus) => {
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
export const finishEdition = async (db: Collections, edition: Edition, timeZone: string) => {
  if (!isDrawn(edition)) throw wrongStatus(edition);
  const now = new Date();
  const today = todayIn(timeZone, now);
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
  await saveResults(db, edition, now);
};

/**
 * The organizer's ways around dates (64), in the group page's Manage menu. None of them reveals
 * who drew whom: the big reveal keeps its own switch and gift day gate.
 */
export const manageRouter = router({
  /** drawn → giftday now, without waiting for the gift day date (or when there is none). */
  startGiftDay: organizerEditionProcedure.mutation(async ({ ctx }) => {
    await toGiftDayToday(ctx.db, ctx.group, ctx.edition, 'drawn');
    return { ok: true };
  }),

  /** giftday → done now, without waiting for the next day. */
  finishGiftDay: organizerEditionProcedure.mutation(async ({ ctx }) => {
    if (ctx.edition.status !== 'giftday') throw wrongStatus(ctx.edition);
    await finishEdition(ctx.db, ctx.edition, ctx.group.timeZone);
    return { ok: true };
  }),

  /**
   * giftday → drawn with a new gift day after today (today would start it again on the next tick).
   * Only while nobody has unwrapped, no Santa was shown at a turn (62) and the big reveal isn't out:
   * what people saw can't be unseen. Guessing opens again (it's open while shopping).
   * The gift day reminders already sent go, so the new day gets them.
   */
  backToShopping: organizerEditionProcedure
    .input(v.object({ giftDayDate: LocalDate }))
    .mutation(async ({ ctx, input }) => {
      const { edition } = ctx;
      if (edition.status !== 'giftday') throw wrongStatus(edition);
      if (input.giftDayDate <= todayIn(ctx.group.timeZone)) throw new AppError('DATE_IN_PAST');
      const progress = edition.unwrapOrder?.progress;
      if ((progress?.turns.length ?? 0) > 0 || (progress?.santaShownIds?.length ?? 0) > 0 || edition.reveal.revealedAt) {
        throw new AppError('GIFT_DAY_UNDERWAY');
      }
      const now = new Date();
      const saved = await ctx.db.editions.updateOne(
        {
          _id: edition._id,
          status: 'giftday',
          'unwrapOrder.progress.turns.0': { $exists: false },
          'unwrapOrder.progress.santaShownIds.0': { $exists: false },
          'reveal.revealedAt': { $exists: false },
        },
        {
          $set: {
            status: 'drawn',
            giftDay: { ...edition.giftDay, date: input.giftDayDate },
            calendarSequence: (edition.calendarSequence ?? 0) + 1,
            updatedAt: now,
          },
          $unset: { 'statusChangedAt.giftday': true, 'unwrapOrder.progress': true },
        }
      );
      if (saved.matchedCount === 0) throw new AppError('EDITION_CHANGED');
      await ctx.db.sentNotifications.deleteMany({ _id: { $regex: `^reminder:giftday:${edition._id}:` } });
      return { ok: true };
    }),

  /** done → giftday until the end of today, for corrections; only the group's latest edition. */
  reopenGiftDay: organizerEditionProcedure.mutation(async ({ ctx }) => {
    const latest = await currentEdition(ctx.db, ctx.group._id);
    if (latest?._id !== ctx.edition._id) throw new AppError('EDITION_CLOSED');
    await toGiftDayToday(ctx.db, ctx.group, ctx.edition, 'done');
    return { ok: true };
  }),
});
