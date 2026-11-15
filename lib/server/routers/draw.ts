import { santaAndGiftee } from '../draw/rules';
import { gifteeRedraw } from '../draw/save';
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

  /**
   * My giftee in this edition (the reveal card), or null before the draw / when I'm not in it. `redrawn`: my giftee
   * changed with the organizer's re-draw, not because someone joined or left.
   */
  mine: editionProcedure.query(({ ctx }) => {
    const me = ctx.edition.participants.find((p) => p.memberId === ctx.member.id);
    const { giftee } = santaAndGiftee(ctx.group, ctx.edition, ctx.member);
    // Invitees are in the draw before they accept (98): a giftee that changed before they joined is just their giftee.
    const { joinedAt } = ctx.member;
    const changedAt = me?.gifteeChangedAt && !(joinedAt && me.gifteeChangedAt < joinedAt) ? me.gifteeChangedAt : null;
    return {
      inEdition: Boolean(me?.participates),
      giftee: giftee ? { name: giftee.name } : null,
      changedAt,
      redrawn: changedAt !== null && gifteeRedraw(ctx.edition, ctx.member.id) === 'organizer',
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
