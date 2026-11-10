import * as v from 'valibot';
import { HttpUrl, Id, MultiLine, Price, SingleLine } from './common';

/** wish: a normal wish. surpriseMe: open to ideas. donation: "no gifts, donate to …" (46). */
export const WishKind = v.picklist(['wish', 'surpriseMe', 'donation']);
export type WishKind = v.InferOutput<typeof WishKind>;

export const MAX_WISH_LINKS = 10;

/**
 * A product page for a wish (73). A wish's links are alternatives: any of them will do. The
 * link's title and price describe that listing; the wish keeps its own. The shop shown is the
 * URL's host.
 */
export const WishLink = v.object({
  url: HttpUrl,
  title: v.optional(SingleLine(200)),
  price: v.optional(Price),
  /** Image downloaded once by the URL import and served by us (39: no hotlinking). GridFS file id. */
  imageId: v.optional(Id),
});
export type WishLink = v.InferOutput<typeof WishLink>;

/** Fields the owner edits (38, 46, 73). Cards show the first link's image. */
export const WishFields = v.object({
  kind: v.optional(WishKind, 'wish'),
  title: SingleLine(200),
  description: v.optional(MultiLine(2000)),
  links: v.optional(v.pipe(v.array(WishLink), v.maxLength(MAX_WISH_LINKS)), []),
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
  /** Marked received after gift day ("I got this"); from then on it's in the archive like an archived wish. */
  receivedAt: v.optional(v.date()),
  /** Archived by the owner (76): only on their own /wishlist, under Archived. Absent on older documents = not archived. */
  archivedAt: v.optional(v.date()),
  createdAt: v.date(),
  updatedAt: v.date(),
});
export type Wish = v.InferOutput<typeof Wish>;
