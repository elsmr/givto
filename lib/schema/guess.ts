import * as v from 'valibot';
import { Id } from './common';

/**
 * `guesses` collection, Guess your Santa (62, 82, 94): who a participant thinks is the Santa of one giftee, one row
 * per guesser per giftee (unique index), their own row (giftee = guesser) included. Changeable from the draw until
 * that giftee's Santa is out (their turn in the presenter, or the big reveal). Nobody else sees a row; once that
 * Santa is out, only the giftee's own guess comes out by name, the rest as counts per name.
 */
export const Guess = v.object({
  _id: Id,
  editionId: Id,
  guesserMemberId: Id,
  gifteeMemberId: Id,
  /** Anyone in the draw but the guesser and the giftee; never on the row for the guesser's own giftee. */
  santaMemberId: Id,
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type Guess = v.InferOutput<typeof Guess>;
