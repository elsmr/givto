import * as v from 'valibot';
import { Id } from '../../schema/common';
import { isDuplicateKey, newId } from '../db';
import { AppError } from '../errors';
import { boardOf, guessingOn, guessingOpen } from '../guess/guesses';
import { editionProcedure, organizerEditionProcedure, router } from '../trpc';
import { giftDayView } from './giftday-view';

/**
 * Guess your Santa (62): one locked guess per person while shopping, with the rest of the draw as
 * optional rows (82). Nothing here says who anyone's Santa is or whether a guess is right until it's
 * out (their turn in the presenter, or the big reveal).
 */
export const guessRouter = router({
  /**
   * My guess, who I can pick while it's open, and the answer once it's out. Null when guessing is off or I'm not in the draw.
   * `board` (82): my giftee (my row, prefilled) and a row per other giftee with my guess, or null while open / not guessed.
   */
  mine: editionProcedure.query(async ({ ctx }) => {
    const { edition, group, member } = ctx;
    const assignments = edition.draw?.assignments ?? {};
    const inDraw = Object.keys(assignments);
    if (!guessingOn(edition) || !inDraw.includes(member.id)) return null;
    const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';
    const person = (memberId: string) => ({ memberId, name: nameOf(memberId) });
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    const guess = await ctx.db.guesses.findOne({ editionId: edition._id, guesserMemberId: member.id });
    const open = guessingOpen(edition) && !guess;
    const board: Record<string, string> = guess ? boardOf(guess) : {};
    const mine = guess ? { [member.id]: board } : {};
    const result = giftDayView(group, edition, {}, mine).guessing?.results.find((r) => r.memberId === member.id);
    const myGiftee = assignments[member.id];
    return {
      open,
      guess: guess && person(guess.guessedMemberId),
      people: open ? inDraw.filter((id) => id !== member.id).map(person).toSorted(byName) : [],
      result: result ? { santa: result.santa, right: result.right } : null,
      board:
        open || guess
          ? {
              myGiftee: person(myGiftee),
              rows: inDraw
                .filter((id) => id !== member.id && id !== myGiftee)
                .map((id) => ({ ...person(id), santa: board[id] ? person(board[id]) : null }))
                .toSorted(byName),
            }
          : null,
    };
  }),

  /**
   * Locks in my guess: anyone else in the draw. Optional rows for the rest of the draw (82): others than
   * me and my giftee, each Santa at most once (my own guess included), never me nor the giftee. Once only, while shopping.
   */
  make: editionProcedure
    .input(
      v.object({
        memberId: Id,
        pairs: v.optional(v.pipe(v.array(v.object({ gifteeMemberId: Id, santaMemberId: Id })), v.maxLength(500)), []),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { edition, member } = ctx;
      if (!guessingOpen(edition)) throw new AppError('GUESSING_CLOSED');
      const assignments = edition.draw?.assignments ?? {};
      const inDraw = Object.keys(assignments);
      if (!inDraw.includes(member.id) || !inDraw.includes(input.memberId) || input.memberId === member.id) {
        throw new AppError('NOT_FOUND');
      }
      const giftees = input.pairs.map((pair) => pair.gifteeMemberId);
      const santas = [input.memberId, ...input.pairs.map((pair) => pair.santaMemberId)];
      const validRow = ({ gifteeMemberId, santaMemberId }: { gifteeMemberId: string; santaMemberId: string }) =>
        inDraw.includes(gifteeMemberId) &&
        inDraw.includes(santaMemberId) &&
        ![member.id, assignments[member.id]].includes(gifteeMemberId) &&
        santaMemberId !== member.id &&
        santaMemberId !== gifteeMemberId;
      if (!input.pairs.every(validRow) || new Set(giftees).size < giftees.length || new Set(santas).size < santas.length) {
        throw new AppError('INVALID_INPUT');
      }
      try {
        await ctx.db.guesses.insertOne({
          _id: newId(),
          editionId: edition._id,
          guesserMemberId: member.id,
          guessedMemberId: input.memberId,
          ...(input.pairs.length > 0 && { pairs: input.pairs }),
          createdAt: new Date(),
        });
      } catch (error) {
        if (isDuplicateKey(error)) throw new AppError('GUESS_LOCKED');
        throw error;
      }
      return { ok: true };
    }),

  /** Organizer: Guess your Santa on (default) or off. Off hides every guess and keeps Santas out of the turns. */
  setEnabled: organizerEditionProcedure.input(v.object({ enabled: v.boolean() })).mutation(async ({ ctx, input }) => {
    await ctx.db.editions.updateOne({ _id: ctx.edition._id }, { $set: { guessing: input.enabled, updatedAt: new Date() } });
    return { ok: true };
  }),
});
