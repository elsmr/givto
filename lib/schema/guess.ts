import * as v from 'valibot';
import { Id } from './common';

/**
 * `guesses` collection, Guess your Santa (62): who a participant thinks their Santa is. One per
 * person per edition (unique index), locked once made. Nobody sees it (not the organizer, not the
 * Santa) and nothing says whether it's right until its reveal: the person's turn in the presenter
 * or the big reveal. The guesser sees their own guess, without the answer.
 */
export const Guess = v.object({
  _id: Id,
  editionId: Id,
  guesserMemberId: Id,
  /** Who they think is their Santa: anyone else in the draw, their own giftee too (bluffing is part of the game). */
  guessedMemberId: Id,
  /**
   * Guess the whole draw (82): who they think gives to whom, for others than themselves and their own giftee.
   * Optional rows; each Santa at most once, never the guesser. Absent on guesses made before 82.
   */
  pairs: v.optional(v.array(v.object({ gifteeMemberId: Id, santaMemberId: Id }))),
  createdAt: v.date(),
});
export type Guess = v.InferOutput<typeof Guess>;
