import * as v from 'valibot';
import { Id } from './common';

/** emptyWishlist: "your Secret Santa would love some ideas". moreDetails: wishes exist, add details. */
export const NudgeKind = v.picklist(['emptyWishlist', 'moreDetails']);
export type NudgeKind = v.InferOutput<typeof NudgeKind>;

/**
 * `nudges` collection ("Psst!", 30): log for the per-Santa rate limit and the delayed,
 * anonymous send. Expires via TTL on `createdAt`.
 */
export const Nudge = v.object({
  _id: Id,
  groupId: Id,
  santaMemberId: Id,
  gifteeMemberId: Id,
  kind: NudgeKind,
  /** Sent at a fixed time of day so timing doesn't reveal the sender. */
  sendAfter: v.date(),
  sentAt: v.optional(v.date()),
  createdAt: v.date(),
});
export type Nudge = v.InferOutput<typeof Nudge>;
