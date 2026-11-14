import { santaAndGiftee } from '../draw/rules';
import { drawEdition, lockInEdition, redrawEdition } from '../draw/run';
import { editionProcedure, organizerEditionProcedure, router } from '../trpc';

/** The draw (34). Results are never listed: each person only reads their own giftee. */
export const drawRouter = router({
  /** "Draw names" now; refuses with the stuck people's ids when the rules make it impossible. */
  run: organizerEditionProcedure.mutation(async ({ ctx }) => {
    await drawEdition(ctx.db, ctx.group, ctx.edition);
    return { ok: true };
  }),

  /** White elephant (88): "Lock in" instead of drawing names. */
  lockIn: organizerEditionProcedure.mutation(async ({ ctx }) => {
    await lockInEdition(ctx.db, ctx.group, ctx.edition);
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
    const { giftee } = santaAndGiftee(ctx.group, ctx.edition, ctx.member);
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
});
