import * as v from 'valibot';
import { Id } from '../../schema/common';
import { drawsNames, isDrawn, isFromGiftDay, UnwrapMode, type Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Collections } from '../db';
import { playerIds } from '../draw/rules';
import { AppError } from '../errors';
import { giftCounts } from '../gift/marks';
import { guessesOf } from '../guess/guesses';
import { newUnwrapOrder, runGiftDayTransitions } from '../jobs/giftday';
import { testHooksEnabled } from '../test-hooks';
import { authedProcedure, editionProcedure, organizerEditionProcedure, publicProcedure, router } from '../trpc';
import { giftDayView, presenterGiftDayView } from './giftday-view';
import { AdvanceInput, advanceUnwrapping } from './unwrap-advance';

const presenterView = async (db: Collections, group: Group, edition: Edition) => ({
  groupName: group.name,
  title: edition.title,
  kind: edition.kind ?? 'secretSanta',
  status: edition.status,
  ...presenterGiftDayView(group, edition, await giftCounts(db, edition), await guessesOf(db, edition)),
});

/** giftday.get, also pushed by the gift day stream (97). */
export const memberView = async (db: Collections, group: Group, edition: Edition) =>
  giftDayView(group, edition, await giftCounts(db, edition), await guessesOf(db, edition));

/** Gift day (31), the unwrap order (32), the big reveal and "received" wishes (38). */
export const giftdayRouter = router({
  /** Unwrap order and reveal state for the group home; Santas only once revealed. */
  get: editionProcedure.query(({ ctx }) => memberView(ctx.db, ctx.group, ctx.edition)),

  /** The presenter view (/g/[slug]/present) is the organizer's (PLAN-v2). */
  presenter: organizerEditionProcedure.query(({ ctx }) => presenterView(ctx.db, ctx.group, ctx.edition)),

  /** Shuffle (or reshuffle) the unwrap order: everyone sees the same stored order. Starts the unwrapping over. */
  shuffle: organizerEditionProcedure.mutation(async ({ ctx }) => {
    const { edition } = ctx;
    if (edition.status === 'done') throw new AppError('EDITION_CLOSED');
    const inDraw = playerIds(ctx.group, edition);
    if (!isDrawn(edition) || inDraw.length < 2) throw new AppError('NOT_DRAWN');
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
    // One gift each without a draw: one to bring (88), one from everyone (90).
    if (!drawsNames(ctx.edition) && input.mode !== 'allAtOnce') throw new AppError('FORBIDDEN');
    await ctx.db.editions.updateOne(
      { _id: ctx.edition._id },
      { $set: { unwrapMode: input.mode, updatedAt: new Date() }, $unset: { 'unwrapOrder.progress': true } }
    );
    return { ok: true };
  }),

  /** The presenter's next step (organizer only); see `advanceUnwrapping`. Returns the new presenter view. */
  advance: organizerEditionProcedure.input(AdvanceInput).mutation(async ({ ctx, input }) => {
    const edition = await advanceUnwrapping(ctx.db, ctx.group, ctx.edition, input);
    return presenterView(ctx.db, ctx.group, edition);
  }),

  /** The big reveal on or off (off by default), any time. Off again hides it from everyone. */
  setReveal: organizerEditionProcedure.input(v.object({ enabled: v.boolean() })).mutation(async ({ ctx, input }) => {
    if (!drawsNames(ctx.edition) && input.enabled) throw new AppError('FORBIDDEN');
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
    if (!isFromGiftDay(ctx.edition)) throw new AppError('NOT_GIFT_DAY');
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

  /** Tests only (lib/server/test-hooks.ts): what the scheduled job does, optionally at a given time. */
  runDue: publicProcedure
    .input(v.object({ now: v.optional(v.pipe(v.string(), v.isoTimestamp())), editionIds: v.optional(v.array(Id)) }))
    .mutation(async ({ ctx, input }) => {
      if (!testHooksEnabled()) throw new AppError('NOT_FOUND');
      return runGiftDayTransitions(ctx.db, input.now ? new Date(input.now) : new Date(), input.editionIds);
    }),
});
