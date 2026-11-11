import * as v from 'valibot';
import { Id } from './common';

/**
 * `votes` collection, live voting (83): at someone's turn on gift day, before their Santa is shown,
 * who each person in the draw thinks it was from. One per voter per turn (unique index), changeable
 * while the vote is open. Only counts per name come out, once the presenter closed the vote; nobody
 * sees who voted for whom.
 */
export const Vote = v.object({
  _id: Id,
  editionId: Id,
  /** Whose turn it was: the person unwrapping. */
  turnMemberId: Id,
  voterMemberId: Id,
  votedMemberId: Id,
  createdAt: v.date(),
});
export type Vote = v.InferOutput<typeof Vote>;
