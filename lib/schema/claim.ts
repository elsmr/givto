import * as v from 'valibot';
import { Id } from './common';

/**
 * `claims` collection ("Dibs!", 38). At most one claim per wish (unique index), so other
 * groups' Santas see the wish as taken. Never returned to the wish owner.
 */
export const Claim = v.object({
  _id: Id,
  wishId: Id,
  /** The wish's owner, so claims on one person's wishes can be listed without a join. */
  ownerId: Id,
  groupId: Id,
  santaMemberId: Id,
  createdAt: v.date(),
});
export type Claim = v.InferOutput<typeof Claim>;
