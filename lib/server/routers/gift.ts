import { isDrawn } from '../../schema/edition';
import { GiftFields } from '../../schema/gift';
import { santaActionProcedure } from '../between/santa-role';
import { isDuplicateKey, newId } from '../db';
import { AppError } from '../errors';
import { currentGifts, giftCounts } from '../gift/marks';
import { editionProcedure, organizerEditionProcedure, router } from '../trpc';
import { santaWishes } from '../wishlist/wish-view';

/**
 * "I've got my gift" (63): the Santa ticks wishes they bought and adds things that aren't on the
 * list. Only the Santa sees what; the organizer sees who is still shopping, the giftee a count
 * from gift day on.
 */
export const giftRouter = router({
  /** My mark for my giftee. Before I marked anything, my Dibs! come pre-checked. */
  mine: santaActionProcedure.query(async ({ ctx }) => {
    const { edition, santa, giftee } = ctx;
    const gift = await ctx.db.gifts.findOne({ editionId: edition._id, santaMemberId: santa.id, gifteeMemberId: giftee.id });
    if (gift) return { marked: true, wishIds: gift.wishIds, lines: gift.lines };
    const wishIds = (await santaWishes(ctx.db, giftee, edition._id, santa.id)).map((wish) => wish._id);
    const claims = await ctx.db.claims.find({ editionId: edition._id, santaMemberId: santa.id, wishId: { $in: wishIds } }).toArray();
    return { marked: false, wishIds: claims.map((claim) => claim.wishId), lines: [] as string[] };
  }),

  /** Saves what I got; ticking a free wish also calls Dibs! on it. Nothing ticked or written = not marked. */
  set: santaActionProcedure.input(GiftFields).mutation(async ({ ctx, input }) => {
    const { edition, santa, giftee } = ctx;
    if (edition.status === 'done') throw new AppError('EDITION_CLOSED');
    const wishIds = [...new Set(input.wishIds)];
    const filter = { editionId: edition._id, santaMemberId: santa.id };
    const [wishes, stored] = await Promise.all([santaWishes(ctx.db, giftee, edition._id, santa.id), ctx.db.gifts.findOne(filter)]);
    const visible = new Map(wishes.map((wish) => [wish._id, wish]));
    // A ticked wish the Santa no longer sees (deleted or hidden since) stays ticked: they still bought it.
    const kept = new Set(stored?.gifteeMemberId === giftee.id ? stored.wishIds : []);
    if (wishIds.some((id) => !visible.has(id) && !kept.has(id))) throw new AppError('NOT_FOUND');
    const claims = await ctx.db.claims.find({ wishId: { $in: wishIds } }).toArray();
    const mine = (claim: (typeof claims)[number]) => claim.editionId === edition._id && claim.santaMemberId === santa.id;
    if (claims.some((claim) => !mine(claim))) throw new AppError('WISH_TAKEN');
    const now = new Date();
    for (const wishId of wishIds.filter((id) => visible.has(id) && !claims.some((claim) => claim.wishId === id))) {
      try {
        await ctx.db.claims.insertOne({ _id: newId(), wishId, ownerId: visible.get(wishId)!.ownerId, editionId: edition._id, santaMemberId: santa.id, createdAt: now });
      } catch (error) {
        if (isDuplicateKey(error)) throw new AppError('WISH_TAKEN');
        throw error;
      }
    }
    if (wishIds.length + input.lines.length === 0) {
      await ctx.db.gifts.deleteOne(filter);
      return { marked: false, wishIds, lines: input.lines };
    }
    await ctx.db.gifts.updateOne(
      filter,
      {
        $set: { gifteeMemberId: giftee.id, wishIds, lines: input.lines, updatedAt: now },
        $setOnInsert: { _id: newId(), createdAt: now },
      },
      { upsert: true }
    );
    return { marked: true, wishIds, lines: input.lines };
  }),

  /** Organizer: the names of Santas who haven't marked a gift yet. Never what anyone got, or for whom. */
  stillShopping: organizerEditionProcedure.query(async ({ ctx }) => {
    const { edition, group } = ctx;
    if (!isDrawn(edition)) return null;
    const santas = Object.keys(edition.draw?.assignments ?? {});
    const gifts = await currentGifts(ctx.db, edition);
    const names = santas
      .filter((id) => !gifts.has(id))
      .map((id) => group.members.find((m) => m.id === id)?.name ?? '?')
      .toSorted((a, b) => a.localeCompare(b));
    return { santas: santas.length, stillShopping: names };
  }),

  /** "3 gifts to open": how many gifts I get, from gift day on; null before, or when my Santa marked nothing. */
  toOpen: editionProcedure.query(async ({ ctx }) => {
    const counts = await giftCounts(ctx.db, ctx.edition);
    return { count: ctx.member.id in counts ? counts[ctx.member.id] : null };
  }),
});
