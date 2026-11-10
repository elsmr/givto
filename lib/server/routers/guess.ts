import * as v from 'valibot';
import { Id } from '../../schema/common';
import { newId } from '../db';
import { AppError } from '../errors';
import { guessingOn, guessingOpen } from '../guess/guesses';
import { editionProcedure, router } from '../trpc';
import { organizerEditionProcedure } from './draw';
import { giftDayView } from './giftday-view';

const isDuplicateKey = (error: unknown) => (error as { code?: number }).code === 11000;

/**
 * Guess your Santa (62): one locked guess per person while shopping. Nothing here says who anyone's
 * Santa is or whether a guess is right until it's out (their turn in the presenter, or the big reveal).
 */
export const guessRouter = router({
  /** My guess, who I can pick while it's open, and the answer once it's out. Null when guessing is off or I'm not in the draw. */
  mine: editionProcedure.query(async ({ ctx }) => {
    const { edition, group, member } = ctx;
    const inDraw = Object.keys(edition.draw?.assignments ?? {});
    if (!guessingOn(edition) || !inDraw.includes(member.id)) return null;
    const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';
    const guess = await ctx.db.guesses.findOne({ editionId: edition._id, guesserMemberId: member.id });
    const open = guessingOpen(edition) && !guess;
    const mine = guess ? { [member.id]: guess.guessedMemberId } : {};
    const result = giftDayView(group, edition, {}, mine).guessing?.results.find((r) => r.memberId === member.id);
    return {
      open,
      guess: guess && { memberId: guess.guessedMemberId, name: nameOf(guess.guessedMemberId) },
      people: open
        ? inDraw
            .filter((id) => id !== member.id)
            .map((id) => ({ memberId: id, name: nameOf(id) }))
            .toSorted((a, b) => a.name.localeCompare(b.name))
        : [],
      result: result ? { santa: result.santa, right: result.right } : null,
    };
  }),

  /** Locks in my guess: anyone else in the draw. Once only, while shopping. */
  make: editionProcedure.input(v.object({ memberId: Id })).mutation(async ({ ctx, input }) => {
    const { edition, member } = ctx;
    if (!guessingOpen(edition)) throw new AppError('GUESSING_CLOSED');
    const inDraw = Object.keys(edition.draw?.assignments ?? {});
    if (!inDraw.includes(member.id) || !inDraw.includes(input.memberId) || input.memberId === member.id) {
      throw new AppError('NOT_FOUND');
    }
    try {
      await ctx.db.guesses.insertOne({
        _id: newId(),
        editionId: edition._id,
        guesserMemberId: member.id,
        guessedMemberId: input.memberId,
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
