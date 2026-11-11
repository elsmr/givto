import * as v from 'valibot';
import { Id } from '../../schema/common';
import { isDuplicateKey, newId } from '../db';
import { AppError } from '../errors';
import { guessesOf, guessingOn, guessOpen } from '../guess/guesses';
import { editionProcedure, organizerEditionProcedure, router } from '../trpc';
import { giftDayView } from './giftday-view';

/**
 * Guess your Santa (62, 82, 94): who I think gives to whom, a row per giftee, changeable until that giftee's Santa is
 * out (their turn in the presenter, or the big reveal). Nothing here says who anyone's Santa is or whether a guess is
 * right until it's out.
 */
export const guessRouter = router({
  /**
   * My guesses: a row per giftee but my own (I'm their Santa), mine first, with my pick and whether it can still
   * change; who I can pick; my own Santa once out. Null when guessing is off or I'm not in the draw.
   */
  get: editionProcedure.query(async ({ ctx }) => {
    const { db, edition, group, member } = ctx;
    const assignments = edition.draw?.assignments ?? {};
    const inDraw = Object.keys(assignments);
    if (!guessingOn(edition) || !inDraw.includes(member.id)) return null;
    const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';
    const person = (memberId: string) => ({ memberId, name: nameOf(memberId) });
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    const board = (await guessesOf(db, edition))[member.id] ?? {};
    const result = giftDayView(group, edition, {}, { [member.id]: board }).guessing?.results.find((r) => r.memberId === member.id);
    const others = inDraw.filter((id) => id !== member.id && id !== assignments[member.id]).map(person).toSorted(byName);
    return {
      myGiftee: person(assignments[member.id]),
      people: inDraw.filter((id) => id !== member.id).map(person).toSorted(byName),
      rows: [person(member.id), ...others].map((row) => ({
        ...row,
        santa: board[row.memberId] ? person(board[row.memberId]) : null,
        open: guessOpen(edition, row.memberId),
      })),
      result: result ? { santa: result.santa, right: result.right } : null,
    };
  }),

  /**
   * Sets my guess for each giftee given, over any I had: anyone in the draw but me and the giftee; never for my own
   * giftee. All or nothing: refused when any of them is out already.
   */
  set: editionProcedure
    .input(v.object({ rows: v.pipe(v.array(v.object({ gifteeMemberId: Id, santaMemberId: Id })), v.minLength(1), v.maxLength(500)) }))
    .mutation(async ({ ctx, input }) => {
      const { db, edition, member } = ctx;
      const assignments = edition.draw?.assignments ?? {};
      const inDraw = Object.keys(assignments);
      if (!input.rows.every((row) => guessOpen(edition, row.gifteeMemberId))) throw new AppError('GUESSING_CLOSED');
      if (!inDraw.includes(member.id)) throw new AppError('NOT_FOUND');
      const giftees = input.rows.map((row) => row.gifteeMemberId);
      const valid = ({ gifteeMemberId, santaMemberId }: (typeof input.rows)[number]) =>
        inDraw.includes(gifteeMemberId) &&
        inDraw.includes(santaMemberId) &&
        gifteeMemberId !== assignments[member.id] &&
        santaMemberId !== member.id &&
        santaMemberId !== gifteeMemberId;
      if (!input.rows.every(valid) || new Set(giftees).size < giftees.length) throw new AppError('INVALID_INPUT');
      const now = new Date();
      const save = () =>
        db.guesses.bulkWrite(
          input.rows.map(({ gifteeMemberId, santaMemberId }) => ({
            updateOne: {
              filter: { editionId: edition._id, guesserMemberId: member.id, gifteeMemberId },
              update: { $set: { santaMemberId, updatedAt: now }, $setOnInsert: { _id: newId(), createdAt: now } },
              upsert: true,
            },
          }))
        );
      // Two saves at once: the second upsert loses the race on the unique index and becomes an update.
      await save().catch((error) => (isDuplicateKey(error) ? save() : Promise.reject(error)));
      return { ok: true };
    }),

  /** Organizer: Guess your Santa on (default) or off. Off hides every guess and keeps Santas out of the turns. */
  setEnabled: organizerEditionProcedure.input(v.object({ enabled: v.boolean() })).mutation(async ({ ctx, input }) => {
    await ctx.db.editions.updateOne({ _id: ctx.edition._id }, { $set: { guessing: input.enabled, updatedAt: new Date() } });
    return { ok: true };
  }),
});
