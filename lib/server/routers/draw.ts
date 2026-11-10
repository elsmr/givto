import * as v from 'valibot';
import { drawEdition, redrawEdition } from '../draw/run';
import { AppError } from '../errors';
import { runDueDraws } from '../jobs/draws';
import { testHooksEnabled } from '../test-hooks';
import { editionProcedure, publicProcedure, router } from '../trpc';

export const organizerEditionProcedure = editionProcedure.use(({ ctx, next }) => {
  if (ctx.member.role !== 'organizer') throw new AppError('NOT_ORGANIZER');
  return next();
});

/** The draw (34). Results are never listed: each person only reads their own giftee. */
export const drawRouter = router({
  /** "Draw names" now; refuses with the stuck people's ids when the rules make it impossible. */
  run: organizerEditionProcedure.mutation(async ({ ctx }) => {
    await drawEdition(ctx.db, ctx.group, ctx.edition);
    return { ok: true };
  }),

  /** Re-draw before gift day (27): everyone may get someone new; Dibs! of changed Santas go. */
  redraw: organizerEditionProcedure.mutation(async ({ ctx }) => {
    await redrawEdition(ctx.db, ctx.group, ctx.edition);
    return { ok: true };
  }),

  /** My giftee in this edition (the reveal card), or null before the draw / when I'm not in it. */
  mine: editionProcedure.query(({ ctx }) => {
    const me = ctx.edition.participants.find((p) => p.memberId === ctx.member.id);
    const gifteeId = ctx.edition.draw?.assignments[ctx.member.id];
    const giftee = ctx.group.members.find((m) => m.id === gifteeId);
    return {
      inEdition: Boolean(me?.participates),
      giftee: giftee ? { name: giftee.name } : null,
      changedAt: me?.gifteeChangedAt ?? null,
    };
  }),

  /** I've seen that my giftee changed. */
  seenChange: editionProcedure.mutation(async ({ ctx }) => {
    await ctx.db.editions.updateOne(
      { _id: ctx.edition._id, 'participants.memberId': ctx.member.id },
      { $unset: { 'participants.$.gifteeChangedAt': true } }
    );
    return { ok: true };
  }),

  /** Tests only (lib/server/test-hooks.ts): what the scheduler (S7's cron) does, optionally at a given time. */
  runDue: publicProcedure
    .input(v.object({ now: v.optional(v.pipe(v.string(), v.isoTimestamp())) }))
    .mutation(async ({ input }) => {
      if (!testHooksEnabled()) throw new AppError('NOT_FOUND');
      return runDueDraws(input.now ? new Date(input.now) : new Date());
    }),
});
