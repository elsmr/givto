import * as v from 'valibot';
import { HttpUrl, Id, MultiLine, Price, SingleLine } from './common';

/** wish: a normal wish. surpriseMe: open to ideas. donation: "no gifts, donate to …" (46). */
export const WishKind = v.picklist(['wish', 'surpriseMe', 'donation']);
export type WishKind = v.InferOutput<typeof WishKind>;

/** Fields the owner edits (38, 46). The add form is `title` plus "more". */
export const WishFields = v.object({
  kind: v.optional(WishKind, 'wish'),
  title: SingleLine(200),
  description: v.optional(MultiLine(2000)),
  url: v.optional(HttpUrl),
  imageUrl: v.optional(HttpUrl),
  price: v.optional(Price),
  /** Size, colour, variant. */
  variant: v.optional(SingleLine(200)),
  reallyWant: v.optional(v.boolean(), false),
});
export type WishFields = v.InferOutput<typeof WishFields>;

/**
 * `wishes` collection: one personal list per person, shared by all their groups (38).
 * Groups hide wishes via the member's `wishlistView`; there is one global order.
 */
export const Wish = v.object({
  _id: Id,
  /** User id, or a managed member's member id (see Member). */
  ownerId: Id,
  ...WishFields.entries,
  /** Global order, ascending. Reordering sets a value between the neighbours. */
  position: v.number(),
  /** Marked received after gift day; hidden from the list from then on. */
  receivedAt: v.optional(v.date()),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type Wish = v.InferOutput<typeof Wish>;
