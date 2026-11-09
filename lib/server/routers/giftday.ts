import * as v from 'valibot';
import { Id } from '../../schema/common';
import { UnwrapMode, type Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import { AppError } from '../errors';
import { newUnwrapOrder, runGiftDayTransitions } from '../jobs/giftday';
import { authedProcedure, editionProcedure, publicProcedure, router } from '../trpc';
import { organizerEditionProcedure } from './draw';
import { giftDayView } from './giftday-view';
import { AdvanceInput, advanceUnwrapping } from './unwrap-advance';

const fromGiftDay = (edition: Edition) => edition.status === 'giftday' || edition.status === 'done';

const presenterView = (group: Group, edition: Edition) => ({
  groupName: group.name,
  title: edition.title,
  status: edition.status,
  ...giftDayView(group, edition, { presenter: true }),
});

/** Gift day (31), the unwrap order (32), the big reveal and "received" wishes (38). */
export const giftdayRouter = router({
  /** Unwrap order and reveal state for the group home; Santas only once revealed. */
  get: editionProcedure.query(({ ctx }) => giftDayView(ctx.group, ctx.edition)),

  /** The presenter view (/g/[slug]/present) is the organizer's (PLAN-v2). */
  presenter: organizerEditionProcedure.query(({ ctx }) => presenterView(ctx.group, ctx.edition)),

  /** Shuffle (or reshuffle) the unwrap order: everyone sees the same stored order. Starts the unwrapping over. */
  shuffle: organizerEditionProcedure.mutation(async ({ ctx }) => {
    const { edition } = ctx;
    if (edition.status === 'done') throw new AppError('EDITION_CLOSED');
    const inDraw = Object.keys(edition.draw?.assignments ?? {});
    if ((edition.status !== 'drawn' && edition.status !== 'giftday') || inDraw.length < 2) throw new AppError('NOT_DRAWN');
    const now = new Date();
    const saved = await ctx.db.editions.updateOne(
      { _id: edition._id, status: edition.status },
      { $set: { unwrapOrder: newUnwrapOrder(inDraw, now), updatedAt: now } }
    );
    if (saved.matchedCount === 0) throw new AppError('EDITION_CHANGED');
    return { ok: true };
  }),

  /** All at once (default) or one by one. Starts the unwrapping over. */
  setMode: organizerEditionProcedure.input(v.object({ mode: UnwrapMode })).mutation(async ({ ctx, input }) => {
    if (ctx.edition.status === 'done') throw new AppError('EDITION_CLOSED');
    await ctx.db.editions.updateOne(
      { _id: ctx.edition._id },
      { $set: { unwrapMode: input.mode, updatedAt: new Date() }, $unset: { 'unwrapOrder.progress': true } }
    );
    return { ok: true };
  }),

  /** The presenter's next step (organizer only); see `advanceUnwrapping`. Returns the new presenter view. */
  advance: organizerEditionProcedure.input(AdvanceInput).mutation(async ({ ctx, input }) => {
    const edition = await advanceUnwrapping(ctx.db, ctx.group, ctx.edition, input);
    return presenterView(ctx.group, edition);
  }),

  /** The big reveal on or off (off by default). Off again hides it from everyone. */
  setReveal: organizerEditionProcedure.input(v.object({ enabled: v.boolean() })).mutation(async ({ ctx, input }) => {
    if (!ctx.edition.draw || ctx.edition.status === 'draft' || ctx.edition.status === 'open') throw new AppError('NOT_DRAWN');
    await ctx.db.editions.updateOne(
      { _id: ctx.edition._id },
      input.enabled
        ? { $set: { 'reveal.enabled': true, updatedAt: new Date() } }
        : { $set: { 'reveal.enabled': false, updatedAt: new Date() }, $unset: { 'reveal.revealedAt': true } }
    );
    return { ok: true };
  }),

  /** "Who was whose Santa": from gift day on, when the reveal is on. Everyone sees it from now. */
  reveal: organizerEditionProcedure.mutation(async ({ ctx }) => {
    if (!fromGiftDay(ctx.edition)) throw new AppError('NOT_GIFT_DAY');
    if (!ctx.edition.reveal.enabled) throw new AppError('REVEAL_OFF');
    await ctx.db.editions.updateOne(
      { _id: ctx.edition._id, 'reveal.enabled': true, 'reveal.revealedAt': { $exists: false } },
      { $set: { 'reveal.revealedAt': new Date() } }
    );
    return { ok: true };
  }),

  /** After gift day: "I got this" (owner only). Received wishes leave every list and every Santa's view. */
  markReceived: authedProcedure
    .input(v.object({ wishId: Id, received: v.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const saved = await ctx.db.wishes.updateOne(
        { _id: input.wishId, ownerId: ctx.user.id },
        input.received
          ? { $set: { receivedAt: now, updatedAt: now } }
          : { $unset: { receivedAt: true }, $set: { updatedAt: now } }
      );
      if (saved.matchedCount === 0) throw new AppError('NOT_FOUND');
      return { wishId: input.wishId, received: input.received };
    }),

  /** Dev and smoke tests only: what the hourly cron job does, optionally at a given time. */
  runDue: publicProcedure
    .input(v.object({ now: v.optional(v.pipe(v.string(), v.isoTimestamp())) }))
    .mutation(async ({ ctx, input }) => {
      if (process.env.NODE_ENV === 'production') throw new AppError('NOT_FOUND');
      return runGiftDayTransitions(ctx.db, input.now ? new Date(input.now) : new Date());
    }),
});
