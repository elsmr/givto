import * as v from 'valibot';
import { Id } from '../../schema/common';
import { WishFields, type Wish } from '../../schema/wish';
import { newId, type Collections } from '../db';
import { AppError } from '../errors';
import { deleteWishImage, findWishImage } from '../import/wish-images';
import { markWishlistChanged } from '../jobs/wishlist-changes';
import { authedProcedure, memberProcedure, router } from '../trpc';
import { moveWish } from '../wishlist/positions';
import { listWishes, toWishView } from '../wishlist/wish-view';

const MAX_WISHES = 200;
const OPTIONAL_FIELDS = ['description', 'url', 'imageId', 'price', 'variant'] as const;

const WishInput = v.object({ wishId: Id });

// superjson keeps explicit `undefined`s (also inside `price`), and the driver would store them as null.
const withoutUndefined = (value: object): object =>
  Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, entry && typeof entry === 'object' ? withoutUndefined(entry) : entry])
  );
const definedFields = (fields: WishFields) => withoutUndefined(fields) as WishFields;

const findOwnWish = async (ctx: { db: Collections; user: { id: string } }, wishId: string): Promise<Wish> => {
  const wish = await ctx.db.wishes.findOne({ _id: wishId, ownerId: ctx.user.id });
  if (!wish) throw new AppError('NOT_FOUND');
  return wish;
};

/** Only images this person imported can be attached. */
const checkImage = async (imageId: string | undefined, userId: string) => {
  if (imageId && (await findWishImage(imageId))?.metadata.ownerId !== userId) {
    throw new AppError('INVALID_INPUT', { details: { field: 'imageId' } });
  }
};

/** The signed-in person's own wishlist (38): one list, one global order. Outputs never include claims. */
export const wishRouter = router({
  list: authedProcedure.query(async ({ ctx }) => (await listWishes(ctx.db, ctx.user.id)).map(toWishView)),

  create: authedProcedure.input(WishFields).mutation(async ({ ctx, input }) => {
    const existing = await listWishes(ctx.db, ctx.user.id);
    if (existing.length >= MAX_WISHES) throw new AppError('WISHLIST_FULL', { details: { max: MAX_WISHES } });
    await checkImage(input.imageId, ctx.user.id);
    const now = new Date();
    const wish: Wish = {
      _id: newId(),
      ownerId: ctx.user.id,
      ...definedFields(input),
      position: (existing.at(-1)?.position ?? -1) + 1,
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
      if (fields.imageId !== wish.imageId) await checkImage(fields.imageId, ctx.user.id);
      const cleared = OPTIONAL_FIELDS.filter((key) => fields[key] === undefined);
      const unset = Object.fromEntries(cleared.map((key) => [key, true as const]));
      const updated = await ctx.db.wishes.findOneAndUpdate(
        { _id: wishId, ownerId: ctx.user.id },
        { $set: { ...definedFields(fields), updatedAt: new Date() }, ...(cleared.length > 0 && { $unset: unset }) },
        { returnDocument: 'after' }
      );
      if (!updated) throw new AppError('NOT_FOUND');
      if (wish.imageId && wish.imageId !== fields.imageId) await deleteWishImage(wish.imageId);
      await markWishlistChanged(ctx.db, ctx.user.id);
      return toWishView(updated);
    }),

  delete: authedProcedure.input(WishInput).mutation(async ({ ctx, input }) => {
    const wish = await findOwnWish(ctx, input.wishId);
    await ctx.db.wishes.deleteOne({ _id: wish._id, ownerId: ctx.user.id });
    await Promise.all([
      ctx.db.claims.deleteMany({ wishId: wish._id }),
      ctx.db.groups.updateMany(
        { 'members.userId': ctx.user.id },
        { $pull: { 'members.$[].wishlistView.hiddenWishIds': wish._id } }
      ),
      wish.imageId && deleteWishImage(wish.imageId),
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
