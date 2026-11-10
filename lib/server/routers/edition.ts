import { isBeforeDraw, type Edition } from '../../schema/edition';
import { isDuplicateKey, newId } from '../db';
import { AppError } from '../errors';
import { currentEdition } from '../membership';
import { organizerEditionProcedure, organizerProcedure, router } from '../trpc';

/** Editions (33): "Same again next year" as a draft, opened once the organizer is happy. */
export const editionRouter = router({
  /**
   * The next edition as a draft: every joined member ticked, last year's settings, "not the
   * same as last year" on when there was a draw. Nothing is sent until it opens.
   */
  startNext: organizerProcedure.mutation(async ({ ctx }) => {
    const current = await currentEdition(ctx.db, ctx.group._id);
    if (!current || isBeforeDraw(current)) throw new AppError('EDITION_IN_PROGRESS');
    const now = new Date();
    const year = current.year + 1;
    const hadDraw = Object.keys(current.draw?.assignments ?? {}).length > 0;
    const edition: Edition = {
      _id: newId(),
      groupId: ctx.group._id,
      number: current.number + 1,
      year,
      title: `Secret Santa ${year}`,
      exchangeMode: current.exchangeMode,
      ...(current.budget && { budget: current.budget }),
      avoidPreviousGiftees: hadDraw,
      ...(hadDraw && { previousEditionId: current._id }),
      status: 'draft',
      statusChangedAt: { draft: now },
      participants: ctx.group.members
        .filter((m) => m.status === 'joined')
        .map((m) => ({ memberId: m.id, participates: true, status: 'joined' as const, addedAt: now })),
      reveal: { enabled: false },
      createdAt: now,
      updatedAt: now,
    };
    try {
      await ctx.db.editions.insertOne(edition);
    } catch (error) {
      // Unique (groupId, number): someone started it a moment ago.
      if (isDuplicateKey(error)) throw new AppError('EDITION_IN_PROGRESS');
      throw error;
    }
    return { number: edition.number };
  }),

  /** Draft → open: people can join and the draw can be scheduled or run. */
  open: organizerEditionProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const opened = await ctx.db.editions.updateOne(
      { _id: ctx.edition._id, status: 'draft' },
      { $set: { status: 'open', 'statusChangedAt.open': now, updatedAt: now } }
    );
    if (opened.matchedCount === 0) throw new AppError('EDITION_CHANGED');
    return { ok: true };
  }),
});
