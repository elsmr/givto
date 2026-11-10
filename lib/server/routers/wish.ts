import * as v from 'valibot';
import { Id } from '../../schema/common';
import { WishFields, type Wish } from '../../schema/wish';
import { newId, type Collections } from '../db';
import { AppError } from '../errors';
import { deleteWishImage, findWishImage } from '../import/wish-images';
import { markWishlistChanged } from '../jobs/wishlist-changes';
import { authedProcedure, memberProcedure, router } from '../trpc';
import { moveWish } from '../wishlist/positions';
import { inArchive, listWishes, toWishView } from '../wishlist/wish-view';

const MAX_WISHES = 200;
const OPTIONAL_FIELDS = ['description', 'price', 'variant'] as const;

const WishInput = v.object({ wishId: Id });

// superjson keeps explicit `undefined`s (also inside `price`), and the driver would store them as null.
const withoutUndefined = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, withoutUndefined(entry)])
  );
};
const definedFields = (fields: WishFields) => withoutUndefined(fields) as WishFields;

const findOwnWish = async (ctx: { db: Collections; user: { id: string } }, wishId: string): Promise<Wish> => {
  const wish = await ctx.db.wishes.findOne({ _id: wishId, ownerId: ctx.user.id });
  if (!wish) throw new AppError('NOT_FOUND');
  return wish;
};

const imageIds = (wish: Pick<WishFields, 'links'>) => wish.links.flatMap((link) => (link.imageId ? [link.imageId] : []));

/** Only images this person imported can be attached. */
const checkImages = async (ids: string[], userId: string) => {
  for (const imageId of ids) {
    if ((await findWishImage(imageId))?.metadata.ownerId !== userId) {
      throw new AppError('INVALID_INPUT', { details: { field: 'imageId' } });
    }
  }
};

/** The signed-in person's own wishlist (38): one list, one global order. Outputs never include claims. */
export const wishRouter = router({
  list: authedProcedure.query(async ({ ctx }) => (await listWishes(ctx.db, ctx.user.id)).map(toWishView)),

  create: authedProcedure.input(WishFields).mutation(async ({ ctx, input }) => {
    const existing = await listWishes(ctx.db, ctx.user.id);
    if (existing.length >= MAX_WISHES) throw new AppError('WISHLIST_FULL', { details: { max: MAX_WISHES } });
    await checkImages(imageIds(input), ctx.user.id);
    const now = new Date();
    const wish: Wish = {
      _id: newId(),
      ownerId: ctx.user.id,
      ...definedFields(input),
      position: (existing[0]?.position ?? 1) - 1,
      createdAt: now,
      updatedAt: now,
    };
    await ctx.db.wishes.insertOne(wish);
    // Groups where this person turned off "show new wishes" (member.wishlistView) hide it.
    const optedOut = { userId: ctx.user.id, 'wishlistView.includeNewWishes': false };
    await ctx.db.groups.updateMany(
      { members: { $elemMatch: optedOut } },
      { $addToSet: { 'members.$[m].wishlistView.hiddenWishIds': wish._id } },
      { arrayFilters: [{ 'm.userId': ctx.user.id, 'm.wishlistView.includeNewWishes': false }] }
    );
    await markWishlistChanged(ctx.db, ctx.user.id);
    return toWishView(wish);
  }),

  update: authedProcedure
    .input(v.object({ ...WishInput.entries, ...WishFields.entries }))
    .mutation(async ({ ctx, input: { wishId, ...fields } }) => {
      const wish = await findOwnWish(ctx, wishId);
      const before = imageIds(wish);
      const after = imageIds(fields);
      await checkImages(after.filter((id) => !before.includes(id)), ctx.user.id);
      const cleared = OPTIONAL_FIELDS.filter((key) => fields[key] === undefined);
      const unset = Object.fromEntries(cleared.map((key) => [key, true as const]));
      const updated = await ctx.db.wishes.findOneAndUpdate(
        { _id: wishId, ownerId: ctx.user.id },
        { $set: { ...definedFields(fields), updatedAt: new Date() }, ...(cleared.length > 0 && { $unset: unset }) },
        { returnDocument: 'after' }
      );
      if (!updated) throw new AppError('NOT_FOUND');
      await Promise.all(before.filter((id) => !after.includes(id)).map(deleteWishImage));
      await markWishlistChanged(ctx.db, ctx.user.id);
      return toWishView(updated);
    }),

  /** My archive, last archived first. Archived wishes reach no group and no Santa, except a Santa's own Dibs! (santaWishes). */
  archived: authedProcedure.query(async ({ ctx }) =>
    (await ctx.db.wishes.find({ ownerId: ctx.user.id, ...inArchive }).sort({ updatedAt: -1, _id: 1 }).toArray()).map(toWishView)
  ),

  /** Claims, gift marks and per-group hiding stay, so a restore brings the wish back as it was. */
  archive: authedProcedure.input(WishInput).mutation(async ({ ctx, input }) => {
    const wish = await findOwnWish(ctx, input.wishId);
    if ((await ctx.db.wishes.countDocuments({ ownerId: ctx.user.id, ...inArchive })) >= MAX_WISHES) {
      throw new AppError('ARCHIVE_FULL', { details: { max: MAX_WISHES } });
    }
    const now = new Date();
    await ctx.db.wishes.updateOne({ _id: wish._id, ownerId: ctx.user.id }, { $set: { archivedAt: now, updatedAt: now } });
    await markWishlistChanged(ctx.db, ctx.user.id);
    return { wishId: wish._id };
  }),

  /** Back at the end of the list; also brings back a wish marked received. */
  restore: authedProcedure.input(WishInput).mutation(async ({ ctx, input }) => {
    const current = await listWishes(ctx.db, ctx.user.id);
    if (current.length >= MAX_WISHES) throw new AppError('WISHLIST_FULL', { details: { max: MAX_WISHES } });
    const restored = await ctx.db.wishes.findOneAndUpdate(
      { _id: input.wishId, ownerId: ctx.user.id, ...inArchive },
      {
        $set: { position: (current.at(-1)?.position ?? -1) + 1, updatedAt: new Date() },
        $unset: { archivedAt: true, receivedAt: true },
      },
      { returnDocument: 'after' }
    );
    if (!restored) throw new AppError('NOT_FOUND');
    await markWishlistChanged(ctx.db, ctx.user.id);
    return toWishView(restored);
  }),

  /** "Delete for good" from the archive; Santas keep their gift marks (they bought it). */
  delete: authedProcedure.input(WishInput).mutation(async ({ ctx, input }) => {
    const wish = await findOwnWish(ctx, input.wishId);
    await ctx.db.wishes.deleteOne({ _id: wish._id, ownerId: ctx.user.id });
    await Promise.all([
      ctx.db.claims.deleteMany({ wishId: wish._id }),
      ctx.db.groups.updateMany(
        { 'members.userId': ctx.user.id },
        { $pull: { 'members.$[].wishlistView.hiddenWishIds': wish._id } }
      ),
      ...imageIds(wish).map(deleteWishImage),
      markWishlistChanged(ctx.db, ctx.user.id),
    ]);
    return { wishId: wish._id };
  }),

  /** Drag or keyboard reorder: put the wish at `toIndex` of the list. */
  move: authedProcedure
    .input(v.object({ ...WishInput.entries, toIndex: v.pipe(v.number(), v.integer(), v.minValue(0)) }))
    .mutation(async ({ ctx, input }) => {
      await findOwnWish(ctx, input.wishId);
      await moveWish(ctx.db, ctx.user.id, input.wishId, input.toIndex);
      return (await listWishes(ctx.db, ctx.user.id)).map(toWishView);
    }),

  /** My wishlist as this group sees it: every wish with its hidden flag for this group. */
  groupView: memberProcedure.query(async ({ ctx }) => {
    const hidden = new Set(ctx.member.wishlistView?.hiddenWishIds ?? []);
    return (await listWishes(ctx.db, ctx.user.id)).map((wish) => ({ ...toWishView(wish), hidden: hidden.has(wish._id) }));
  }),

  /** Hide or show one of my wishes in this group (default: shown). */
  setHidden: memberProcedure
    .input(v.object({ ...WishInput.entries, hidden: v.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await findOwnWish(ctx, input.wishId);
      const path = 'members.$[m].wishlistView.hiddenWishIds';
      await ctx.db.groups.updateOne(
        { _id: ctx.group._id },
        input.hidden ? { $addToSet: { [path]: input.wishId } } : { $pull: { [path]: input.wishId } },
        { arrayFilters: [{ 'm.id': ctx.member.id }] }
      );
      await markWishlistChanged(ctx.db, ctx.user.id);
      return { wishId: input.wishId, hidden: input.hidden };
    }),
});
