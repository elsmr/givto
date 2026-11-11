import * as v from 'valibot';
import { isDrawn, PostalAddress, type Edition } from '../../schema/edition';
import { findSantaRole } from '../between/santa-role';
import { AppError } from '../errors';
import { editionProcedure, organizerEditionProcedure, router } from '../trpc';

const isPosted = (edition: Edition) => edition.exchangeMode !== 'inPerson';
const canAdd = (edition: Edition) => isPosted(edition) && (edition.status === 'open' || edition.status === 'drawn');
const participantOf = (edition: Edition, memberId: string) =>
  edition.participants.find((p) => p.memberId === memberId && p.participates && p.status === 'joined');

/** Adding or removing my own address: I'm in this edition, gifts are posted, and it's open or drawn. */
const ownAddressProcedure = editionProcedure.use(({ ctx, next }) => {
  if (!isPosted(ctx.edition) || !participantOf(ctx.edition, ctx.member.id)) throw new AppError('FORBIDDEN');
  if (!canAdd(ctx.edition)) throw new AppError('EDITION_CLOSED');
  return next();
});

/**
 * Postal addresses (80), only in editions that send gifts by post: each person adds their own; only
 * their Santa reads it, from the draw on; the organizer only sees who hasn't added one.
 */
export const addressRouter = router({
  /** My address in this edition; null when I have none, I'm not in it or gifts aren't posted. */
  mine: editionProcedure.query(({ ctx }) =>
    isPosted(ctx.edition) ? (participantOf(ctx.edition, ctx.member.id)?.address ?? null) : null
  ),

  set: ownAddressProcedure.input(v.object({ address: PostalAddress })).mutation(async ({ ctx, input }) => {
    // updatedAt too: settings.participants rewrites the participants array guarded by it.
    await ctx.db.editions.updateOne(
      { _id: ctx.edition._id, 'participants.memberId': ctx.member.id },
      { $set: { 'participants.$.address': input.address, updatedAt: new Date() } }
    );
    return { ok: true };
  }),

  clear: ownAddressProcedure.mutation(async ({ ctx }) => {
    await ctx.db.editions.updateOne(
      { _id: ctx.edition._id, 'participants.memberId': ctx.member.id },
      { $unset: { 'participants.$.address': true }, $set: { updatedAt: new Date() } }
    );
    return { ok: true };
  }),

  /** Where to post my gift: my giftee's name and address (null until they add it). Null before the draw and for anyone but their Santa. */
  giftee: editionProcedure.query(({ ctx }) => {
    const { edition } = ctx;
    if (!isPosted(edition) || !isDrawn(edition)) return null;
    const role = findSantaRole(ctx.group, edition, ctx.member, undefined);
    if (!role) return null;
    return { name: role.giftee.name, address: edition.participants.find((p) => p.memberId === role.giftee.id)?.address ?? null };
  }),

  /**
   * Organizer: how many people are in and the names of those without an address. Never an address.
   * Managed members can't add one themselves, so they aren't counted.
   */
  missing: organizerEditionProcedure.query(({ ctx }) => {
    const { edition, group } = ctx;
    if (!canAdd(edition)) return null;
    const people = group.members.filter((m) => m.userId && participantOf(edition, m.id));
    const missing = people
      .filter((m) => !participantOf(edition, m.id)?.address)
      .map((m) => m.name)
      .toSorted((a, b) => a.localeCompare(b));
    return { people: people.length, missing };
  }),
});
