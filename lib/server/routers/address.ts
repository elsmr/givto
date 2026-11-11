import { ObjectId } from 'mongodb';
import * as v from 'valibot';
import { Id } from '../../schema/common';
import { isDrawn, isPosted, type Edition } from '../../schema/edition';
import { groupAddress, userIdsWithAddress } from '../account/addresses';
import { findSantaRole } from '../between/santa-role';
import { AppError } from '../errors';
import { editionProcedure, memberProcedure, organizerEditionProcedure, router } from '../trpc';

const participates = (edition: Edition, memberId: string) =>
  edition.participants.some((p) => p.memberId === memberId && p.participates && p.status === 'joined');

/**
 * Postal addresses (80). People keep an address book on their account (account.addresses) and pick
 * one per group, else the default goes. In editions that send gifts by post, only their Santa reads it,
 * from the draw until gift day is over; the organizer only sees who has none.
 */
export const addressRouter = router({
  /** The address this group posts to, and the one I picked for it (null: the default). Null when I have none. */
  mine: memberProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.users.findOne({ _id: new ObjectId(ctx.user.id) }, { projection: { addresses: 1, defaultAddressId: 1 } });
    const address = groupAddress(user, ctx.member.addressId);
    return address && { address, pickedId: address.id === ctx.member.addressId ? address.id : null };
  }),

  /** Picks one of my addresses for this group; none goes back to the default. */
  pick: memberProcedure.input(v.object({ addressId: v.optional(Id) })).mutation(async ({ ctx, input }) => {
    const { addressId } = input;
    if (addressId && !(await ctx.db.users.countDocuments({ _id: new ObjectId(ctx.user.id), 'addresses.id': addressId }, { limit: 1 }))) {
      throw new AppError('NOT_FOUND');
    }
    await ctx.db.groups.updateOne(
      { _id: ctx.group._id, 'members.id': ctx.member.id },
      addressId ? { $set: { 'members.$.addressId': addressId } } : { $unset: { 'members.$.addressId': true } }
    );
    return { ok: true };
  }),

  /** Where to post my gift: my giftee's name and address (null until they add one). Null before the draw and for anyone but their Santa. */
  giftee: editionProcedure.query(async ({ ctx }) => {
    const { edition } = ctx;
    if (!isPosted(edition) || !isDrawn(edition)) return null;
    const role = findSantaRole(ctx.group, edition, ctx.member, undefined);
    if (!role) return null;
    const { userId, addressId, name } = role.giftee;
    const user = userId ? await ctx.db.users.findOne({ _id: new ObjectId(userId) }, { projection: { addresses: 1, defaultAddressId: 1 } }) : null;
    const saved = groupAddress(user, addressId);
    if (!saved) return { name, address: null };
    const { id: _id, ...address } = saved;
    return { name, address };
  }),

  /**
   * Organizer: how many people are in and the names of those without an address. Never an address.
   * Managed members can't add one themselves, so they aren't counted.
   */
  missing: organizerEditionProcedure.query(async ({ ctx }) => {
    const { edition, group } = ctx;
    if (!isPosted(edition) || (edition.status !== 'open' && edition.status !== 'drawn')) return null;
    const people = group.members.filter((m) => m.userId && participates(edition, m.id));
    const withAddress = await userIdsWithAddress(ctx.db, people);
    const missing = people
      .filter((m) => !withAddress.has(m.userId!))
      .map((m) => m.name)
      .toSorted((a, b) => a.localeCompare(b));
    return { people: people.length, missing };
  }),
});
