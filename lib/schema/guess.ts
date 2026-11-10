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
  createdAt: v.date(),
});
export type Guess = v.InferOutput<typeof Guess>;
