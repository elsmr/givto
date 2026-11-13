import * as v from 'valibot';
import { countryCodes } from '../countries';
import { Email, Id, Locale, PersonName, SingleLine } from './common';

/** Email opt-outs (29, 35). Missing means the default: everything on. */
export const NotificationPrefs = v.object({
  /** Deadline and gift day reminders (29). */
  reminders: v.optional(v.boolean(), true),
  /** Wishlist changes and tips about your giftee (35, 42). */
  wishlistUpdates: v.optional(v.boolean(), true),
  /** Psst! nudges and questions from your Santa (30, 52). */
  santaMessages: v.optional(v.boolean(), true),
  /** Organizers: a daily summary of who joined through the group link (63). */
  joins: v.optional(v.boolean(), true),
});
export type NotificationPrefs = v.InferOutput<typeof NotificationPrefs>;

/** Where gifts by post go (80): only the person's Santa reads it, in by-post Secret Santas, from the draw until gift day is over. */
export const PostalAddress = v.object({
  recipient: v.optional(SingleLine(100)),
  lines: v.pipe(v.array(SingleLine(100)), v.minLength(1), v.maxLength(3)),
  postalCode: SingleLine(20),
  city: SingleLine(100),
  region: v.optional(SingleLine(100)),
  /** ISO 3166-1 alpha-2, e.g. NL. */
  country: v.picklist(countryCodes, 'invalid_country'),
});
export type PostalAddress = v.InferOutput<typeof PostalAddress>;

export const MAX_ADDRESSES = 10;
export const SavedAddress = v.object({ id: Id, ...PostalAddress.entries });
export type SavedAddress = v.InferOutput<typeof SavedAddress>;

/** The avatar fills; without a pick, one is derived from the member id. */
export const avatarColors = ['primary-muted', 'yellow', 'mint', 'coral'] as const;
export const AvatarColor = v.picklist(avatarColors);
export type AvatarColor = v.InferOutput<typeof AvatarColor>;

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
 * `locale` is absent on accounts migrated from the old app (58): the browser decides.
 */
export const User = v.object({
  ...UserFields.entries,
  name: v.string(),
  locale: v.optional(Locale),
  notifications: v.optional(NotificationPrefs),
  /** The address book (80). A group uses its member's `addressId` when that's still here, else the default. */
  addresses: v.optional(v.pipe(v.array(SavedAddress), v.maxLength(MAX_ADDRESSES))),
  /** Set whenever there are addresses. */
  defaultAddressId: v.optional(Id),
  email: Email,
  emailVerified: v.boolean(),
  image: v.optional(v.nullable(v.string())),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type User = v.InferOutput<typeof User>;
