import * as v from 'valibot';
import { todayIn } from '../../local-date';
import { LocalDate } from '../../schema/common';
import { finishEdition, toGiftDayToday, wrongStatus } from '../edition/status';
import { AppError } from '../errors';
import { currentEdition } from '../membership';
import { organizerEditionProcedure, router } from '../trpc';

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
    await finishEdition(ctx.db, ctx.group, ctx.edition);
    return { ok: true };
  }),

  /**
   * giftday → drawn with a new gift day after today (today would start it again on the next tick).
   * Only while nobody has unwrapped, no Santa was shown at a turn (62) and the big reveal isn't out:
   * what people saw can't be unseen.
   * The gift day reminders already sent go, so the new day gets them.
   */
  backToShopping: organizerEditionProcedure
    .input(v.object({ giftDayDate: LocalDate }))
    .mutation(async ({ ctx, input }) => {
      const { edition } = ctx;
      if (edition.status !== 'giftday') throw wrongStatus(edition);
      if (input.giftDayDate <= todayIn(ctx.group.timeZone)) throw new AppError('DATE_IN_PAST');
      const progress = edition.unwrapOrder?.progress;
      if ((progress?.turns.length ?? 0) > 0 || (progress?.moves?.length ?? 0) > 0 || (progress?.santaShownIds?.length ?? 0) > 0 || edition.reveal.revealedAt) {
        throw new AppError('GIFT_DAY_UNDERWAY');
      }
      const now = new Date();
      const saved = await ctx.db.editions.updateOne(
        {
          _id: edition._id,
          status: 'giftday',
          'unwrapOrder.progress.turns.0': { $exists: false },
          'unwrapOrder.progress.moves.0': { $exists: false },
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
