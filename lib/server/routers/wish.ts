import * as v from 'valibot';
import { moveItem } from '../../move-item';
import { Id } from '../../schema/common';
import { Slug } from '../../schema/group';
import { WishFields, type Wish } from '../../schema/wish';
import { newId, type Collections } from '../db';
import { AppError } from '../errors';
import { deleteWishImage, findWishImage } from '../import/wish-images';
import { markWishlistChanged } from '../jobs/wishlist-changes';
import { authedProcedure, memberProcedure, router } from '../trpc';
import { moveWish } from '../wishlist/positions';
import { activeGroupsOf, inArchive, listWishes, toWishView, visibleWishes } from '../wishlist/wish-view';

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

  /** `groupSlugs`: the groups that show the new wish, at the top of their list; it shows in no other group. */
  create: authedProcedure
    .input(v.object({ ...WishFields.entries, groupSlugs: v.optional(v.array(Slug), []) }))
    .mutation(async ({ ctx, input: { groupSlugs, ...fields } }) => {
      const existing = await listWishes(ctx.db, ctx.user.id);
      if (existing.length >= MAX_WISHES) throw new AppError('WISHLIST_FULL', { details: { max: MAX_WISHES } });
      await checkImages(imageIds(fields), ctx.user.id);
      const slugs = [...new Set(groupSlugs)];
      const inGroups = { slug: { $in: slugs }, deletedAt: { $exists: false }, members: { $elemMatch: { userId: ctx.user.id, status: 'joined' } } };
      if ((await ctx.db.groups.countDocuments(inGroups)) !== slugs.length) throw new AppError('GROUP_NOT_FOUND');
      const now = new Date();
      const wish: Wish = {
        _id: newId(),
        ownerId: ctx.user.id,
        ...definedFields(fields),
        position: (existing[0]?.position ?? 1) - 1,
        createdAt: now,
        updatedAt: now,
      };
      await ctx.db.wishes.insertOne(wish);
      if (slugs.length > 0) {
        await ctx.db.groups.updateMany(
          inGroups,
          { $push: { 'members.$[m].wishlistView.shownWishIds': { $each: [wish._id], $position: 0 } } },
          { arrayFilters: [{ 'm.userId': ctx.user.id, 'm.status': 'joined' }] }
        );
      }
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

  /** Claims, gift marks and per-group showing stay, so a restore brings the wish back as it was. */
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
        { $pull: { 'members.$[].wishlistView.shownWishIds': wish._id } }
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

  /**
   * My wishlist as this group sees it: the shown wishes in this group's order, then the hidden ones in
   * the global order. `alsoIn`: my other active groups that show it too, as two Santas might buy it.
   */
  groupView: memberProcedure.query(async ({ ctx }) => {
    const [wishes, shown, active] = await Promise.all([
      listWishes(ctx.db, ctx.user.id),
      visibleWishes(ctx.db, ctx.member),
      activeGroupsOf(ctx.db, ctx.user.id, ctx.group._id),
    ]);
    const hidden = wishes.filter((wish) => !shown.some((other) => other._id === wish._id));
    const withAlsoIn = (wish: Wish, isShown: boolean) => ({
      ...toWishView(wish),
      shown: isShown,
      alsoIn: active.filter((group) => group.shownWishIds.includes(wish._id)).map(({ name }) => ({ name })),
    });
    return [...shown.map((wish) => withAlsoIn(wish, true)), ...hidden.map((wish) => withAlsoIn(wish, false))];
  }),

  /** Reorder this group's wishes: put a shown wish at `toIndex` of the group's list. The global order stays. */
  moveInGroup: memberProcedure
    .input(v.object({ ...WishInput.entries, toIndex: v.pipe(v.number(), v.integer(), v.minValue(0)) }))
    .mutation(async ({ ctx, input }) => {
      const visible = (await visibleWishes(ctx.db, ctx.member)).map((wish) => ({ id: wish._id }));
      if (!visible.some(({ id }) => id === input.wishId)) throw new AppError('NOT_FOUND');
      const moved = moveItem(visible, input.wishId, input.toIndex).map(({ id }) => id);
      // Archived wishes stay shown (for a restore) but out of the list the person reorders.
      const archived = (ctx.member.wishlistView?.shownWishIds ?? []).filter((id) => !moved.includes(id));
      await ctx.db.groups.updateOne(
        { _id: ctx.group._id },
        { $set: { 'members.$[m].wishlistView.shownWishIds': [...moved, ...archived] } },
        { arrayFilters: [{ 'm.id': ctx.member.id }] }
      );
      return { wishId: input.wishId, toIndex: input.toIndex };
    }),

  /** Show or hide one of my wishes in this group. */
  setShown: memberProcedure
    .input(v.object({ ...WishInput.entries, shown: v.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await findOwnWish(ctx, input.wishId);
      const path = 'members.$[m].wishlistView.shownWishIds';
      await ctx.db.groups.updateOne(
        { _id: ctx.group._id },
        input.shown ? { $addToSet: { [path]: input.wishId } } : { $pull: { [path]: input.wishId } },
        { arrayFilters: [{ 'm.id': ctx.member.id }] }
      );
      await markWishlistChanged(ctx.db, ctx.user.id);
      return { wishId: input.wishId, shown: input.shown };
    }),
});
