import * as v from 'valibot';
import { PersonName } from '../../schema/common';
import { MAX_MEMBERS, MIN_PARTICIPANTS, Slug } from '../../schema/group';
import type { Member } from '../../schema/member';
import { newId } from '../db';
import { AppError } from '../errors';
import { findGroupByJoinLink, joinLinkPreview } from '../join-preview';
import { addToCurrentEdition, nameUserIfUnnamed, placeHolding, randomToken } from '../membership';
import { notifyJoinRequest } from '../mail/join-notices';
import { enforceRateLimit } from '../rate-limit';
import { authedProcedure, organizerProcedure, publicProcedure, router } from '../trpc';

const JOINS_PER_USER = { window: 60 * 60, max: 20 };
const JOINS_PER_GROUP = { window: 60 * 60, max: 100 };

const LinkInput = v.object({ groupSlug: Slug, token: v.string() });

export const joinRouter = router({
  /** What the link shows before joining; null for unknown, revoked or expired links. */
  preview: publicProcedure.input(LinkInput).query(async ({ ctx, input }) => {
    const group = await findGroupByJoinLink(ctx.db, input.groupSlug, input.token);
    return group && joinLinkPreview(group);
  }),

  /**
   * Join with the link after verifying the email (the session). Same account = same member;
   * a pending email invite for the same address becomes this member (45).
   */
  accept: authedProcedure
    .input(v.object({ ...LinkInput.entries, name: PersonName }))
    .mutation(async ({ ctx, input }) => {
      const group = await findGroupByJoinLink(ctx.db, input.groupSlug, input.token);
      if (!group?.joinLink) throw new AppError('JOIN_LINK_INVALID');
      await enforceRateLimit(`join:user:${ctx.user.id}`, JOINS_PER_USER);
      await enforceRateLimit(`join:group:${group._id}`, JOINS_PER_GROUP);

      const existing = group.members.find((m) => m.userId === ctx.user.id);
      if (existing && placeHolding.includes(existing.status)) {
        return { slug: group.slug, status: existing.status };
      }
      const status = group.joinLink.requiresApproval ? 'requested' : 'joined';
      const now = new Date();
      const invite = existing
        ? null
        : await ctx.db.invites.findOne(
            { groupId: group._id, email: ctx.user.email.toLowerCase() },
            { sort: { createdAt: -1 } }
          );
      const reusedId = existing?.id ?? invite?.memberId;
      const cap = Math.min(group.joinLink.maxMembers ?? MAX_MEMBERS, MAX_MEMBERS);
      const hasRoom = {
        $expr: {
          $lt: [
            { $size: { $filter: { input: '$members', cond: { $in: ['$$this.status', placeHolding] } } } },
            cap,
          ],
        },
      };

      const updated = reusedId
        ? await ctx.db.groups.updateOne(
            {
              _id: group._id,
              members: {
                $elemMatch: { id: reusedId, status: { $nin: placeHolding }, userId: { $in: [undefined, ctx.user.id] } },
              },
              ...hasRoom,
            },
            {
              $set: {
                'members.$.userId': ctx.user.id,
                'members.$.status': status,
                'members.$.joinedAt': now,
                updatedAt: now,
              },
            }
          )
        : await ctx.db.groups.updateOne(
            { _id: group._id, 'members.userId': { $ne: ctx.user.id }, ...hasRoom },
            {
              $push: {
                members: {
                  id: newId(),
                  userId: ctx.user.id,
                  name: input.name,
                  role: 'member',
                  status,
                  joinedAt: now,
                  wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
                } satisfies Member,
              },
              $set: { updatedAt: now },
            }
          );
      if (updated.matchedCount === 0) throw new AppError('GROUP_FULL');
      if (invite) await ctx.db.invites.updateMany({ memberId: invite.memberId, usedAt: { $exists: false } }, { $set: { usedAt: now } });

      const fresh = await ctx.db.groups.findOne({ _id: group._id });
      const member = fresh?.members.find((m) => m.userId === ctx.user.id);
      if (member && status === 'joined') await addToCurrentEdition(ctx.db, group._id, member.id);
      if (member && status === 'requested') await notifyJoinRequest(ctx.db, group._id, member.id);
      await nameUserIfUnnamed(ctx.db, ctx.user.id, input.name);
      return { slug: group.slug, status };
    }),

  /** Approval and member cap for the join link. `maxMembers: null` removes the cap. */
  updateLink: organizerProcedure
    .input(
      v.object({
        requiresApproval: v.boolean(),
        maxMembers: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(MIN_PARTICIPANTS), v.maxValue(MAX_MEMBERS))),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.group.joinLink) throw new AppError('JOIN_LINK_INVALID');
      const cap = input.maxMembers === null ? { $unset: { 'joinLink.maxMembers': true as const } } : {};
      await ctx.db.groups.updateOne(
        { _id: ctx.group._id },
        {
          $set: {
            'joinLink.requiresApproval': input.requiresApproval,
            ...(input.maxMembers !== null && { 'joinLink.maxMembers': input.maxMembers }),
            updatedAt: new Date(),
          },
          ...cap,
        }
      );
      return { ok: true };
    }),

  /** The current link stops working; `regenerateLink` makes a new one. */
  revokeLink: organizerProcedure.mutation(async ({ ctx }) => {
    await ctx.db.groups.updateOne(
      { _id: ctx.group._id },
      { $set: { 'joinLink.revoked': true, updatedAt: new Date() } }
    );
    return { ok: true };
  }),

  regenerateLink: organizerProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    const token = randomToken();
    await ctx.db.groups.updateOne(
      { _id: ctx.group._id },
      {
        $set: {
          joinLink: {
            token,
            revoked: false,
            requiresApproval: ctx.group.joinLink?.requiresApproval ?? false,
            ...(ctx.group.joinLink?.maxMembers && { maxMembers: ctx.group.joinLink.maxMembers }),
            createdAt: now,
          },
          updatedAt: now,
        },
      }
    );
    return { token };
  }),
});
