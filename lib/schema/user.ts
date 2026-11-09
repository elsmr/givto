import * as v from 'valibot';
import { Email, Locale, PersonName } from './common';

/** Email opt-outs (29, 35). Missing means the default: everything on. */
export const NotificationPrefs = v.object({
  /** Deadline and gift day reminders (29). */
  reminders: v.optional(v.boolean(), true),
  /** Wishlist changes and tips about your giftee (35, 42). */
  wishlistUpdates: v.optional(v.boolean(), true),
  /** Psst! nudges and questions from your Santa (30, 52). */
  santaMessages: v.optional(v.boolean(), true),
  /** Yearly "Same again next year" reminder for organizers (33). */
  nextYear: v.optional(v.boolean(), true),
});
export type NotificationPrefs = v.InferOutput<typeof NotificationPrefs>;

export const avatarColors = ['primary', 'primaryMuted', 'coral', 'yellow', 'mint'] as const;
export const AvatarColor = v.picklist(avatarColors);

/** Fields the user edits on their account. */
export const UserFields = v.object({
  name: PersonName,
  locale: Locale,
  notifications: NotificationPrefs,
  avatarColor: v.optional(AvatarColor),
});

/**
 * `users` collection. Better Auth owns the document and its `_id` (an ObjectId; `id` hex
 * string in sessions); `locale` is a Better Auth additional field, the rest is ours.
 * `name` is '' until the person enters one (sign-in by email doesn't ask for it).
 */
export const User = v.object({
  ...UserFields.entries,
  name: v.string(),
  notifications: v.optional(NotificationPrefs),
  email: Email,
  emailVerified: v.boolean(),
  image: v.optional(v.nullable(v.string())),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type User = v.InferOutput<typeof User>;
