import * as v from 'valibot';
import { Email, Id, SingleLine } from './common';

/**
 * `sentNotifications` collection: idempotency log for scheduled emails (29) and one-off
 * notices. `_id` is the idempotency key, e.g. `wishlistReminder:<editionId>:<memberId>`;
 * inserting it before sending makes each reminder go out once. Expires via TTL.
 */
export const SentNotification = v.object({
  _id: v.pipe(v.string(), v.maxLength(200)),
  kind: v.pipe(v.string(), v.maxLength(50)),
  groupId: v.optional(Id),
  editionId: v.optional(Id),
  userId: v.optional(Id),
  memberId: v.optional(Id),
  sentAt: v.date(),
});
export type SentNotification = v.InferOutput<typeof SentNotification>;

export const WishSnapshot = v.object({
  wishId: Id,
  title: SingleLine(200),
  description: v.optional(v.string()),
});

/**
 * `wishlistNotifications` collection (35): one per giftee per edition. The Santa is told
 * about the diff between the visible wishlist and `snapshot` once `notifyAfter` (quiet
 * period, capped at `firstChangeAt` + max delay) has passed.
 */
export const WishlistNotification = v.object({
  _id: Id,
  editionId: Id,
  gifteeMemberId: Id,
  /** The wishlist as of the last notification. */
  snapshot: v.array(WishSnapshot),
  snapshotAt: v.optional(v.date()),
  /** Set while changes are pending. */
  firstChangeAt: v.optional(v.date()),
  /** The latest pending change: a Santa who viewed the wishlist after it gets no email. */
  lastChangeAt: v.optional(v.date()),
  notifyAfter: v.optional(v.date()),
});
export type WishlistNotification = v.InferOutput<typeof WishlistNotification>;

/**
 * `emailSuppressions` collection (54): addresses that hard-bounced or marked us as spam,
 * from Mailgun's webhook. Notifications skip them; the organizer sees "bounced".
 */
export const EmailSuppression = v.object({
  _id: Email,
  reason: v.picklist(['bounce', 'complaint']),
  at: v.date(),
});
export type EmailSuppression = v.InferOutput<typeof EmailSuppression>;
