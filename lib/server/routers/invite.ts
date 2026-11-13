import * as v from 'valibot';
import { InviteEmail, inviteSubject } from '../../../emails/invite';
import { Email, PersonName } from '../../schema/common';
import { isBeforeDraw } from '../../schema/edition';
import { MAX_MEMBERS, Slug } from '../../schema/group';
import { INVITE_MS } from '../../schema/invite';
import type { Member } from '../../schema/member';
import { newId } from '../db';
import { AppError } from '../errors';
import { findPendingInvite, invitePreview } from '../join-preview';
import { addToCurrentEdition, currentEdition, hashToken, memberProfile, placeHolding, randomToken } from '../membership';
import { sendMail } from '../mail';
import { inviteUrl } from '../mail/urls';
import { enforceRateLimit } from '../rate-limit';
import { removeMember } from '../remove-member';
import { authedProcedure, organizerProcedure, publicProcedure, router } from '../trpc';

const INVITES_PER_USER_PER_DAY = { window: 24 * 60 * 60, max: 30 };
const INVITES_PER_GROUP_PER_DAY = { window: 24 * 60 * 60, max: 50 };

const TokenInput = v.object({ groupSlug: Slug, token: v.string() });

/** Until they accept and say their name, an invitee goes by their email's local part ("jan.peeters" → "jan peeters"): no dots, so never link-like. */
export const standInName = (email: string) => email.split('@')[0].replace(/[._+-]+/g, ' ').trim().slice(0, 50) || 'Guest';

export const inviteRouter = router({
  /**
   * Secondary to the join link (45): one email, single-use token bound to it, 7 days. The invitee names themselves on
   * accept. Before the draw they're in the edition right away (98); after it, only once they accept.
   */
  send: organizerProcedure
    .input(v.object({ email: Email }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`invite:user:${ctx.user.id}`, INVITES_PER_USER_PER_DAY);
      await enforceRateLimit(`invite:group:${ctx.group._id}`, INVITES_PER_GROUP_PER_DAY);
      const account = await ctx.db.users.findOne({ email: input.email }, { projection: { locale: 1, name: 1 } });
      const accountId = account?._id.toHexString();
      if (ctx.group.members.some((m) => m.userId === accountId && placeHolding.includes(m.status))) {
        throw new AppError('ALREADY_MEMBER');
      }

      const now = new Date();
      const pending = await ctx.db.invites.findOne({ groupId: ctx.group._id, email: input.email, usedAt: { $exists: false } });
      const memberId = pending?.memberId ?? newId();
      if (pending) {
        await ctx.db.invites.deleteMany({ memberId });
        // The draw reads how long the invite runs from here (draw/rules.ts).
        await ctx.db.groups.updateOne({ _id: ctx.group._id, 'members.id': memberId }, { $set: { 'members.$.invitedAt': now } });
      } else {
        const member: Member = {
          id: memberId,
          name: account?.name || standInName(input.email),
          role: 'member',
          status: 'invited',
          invitedAt: now,
          invitedBy: ctx.member.id,
          wishlistView: { shownWishIds: [] },
        };
        const added = await ctx.db.groups.updateOne(
          { _id: ctx.group._id, [`members.${MAX_MEMBERS - 1}`]: { $exists: false } },
          { $push: { members: member }, $set: { updatedAt: now } }
        );
        if (added.matchedCount === 0) throw new AppError('GROUP_FULL');
      }
      const edition = await currentEdition(ctx.db, ctx.group._id);
      if (edition && isBeforeDraw(edition)) {
        await ctx.db.editions.updateOne(
          { _id: edition._id, 'participants.memberId': { $ne: memberId } },
          { $push: { participants: { memberId, participates: true, status: 'invited', addedAt: now } }, $set: { updatedAt: now } }
        );
      }

      const token = randomToken();
      await ctx.db.invites.insertOne({
        _id: newId(),
        groupId: ctx.group._id,
        memberId,
        email: input.email,
        tokenHash: hashToken(token),
        createdAt: now,
        expiresAt: new Date(now.getTime() + INVITE_MS),
      });
      const locale = account?.locale ?? ctx.group.locale;
      const names = { locale, organizer: ctx.member.name, group: ctx.group.name };
      await sendMail({
        to: input.email,
        subject: inviteSubject(names),
        body: InviteEmail({ ...names, url: inviteUrl(ctx.group.slug, token) }),
      });
      return { memberId };
    }),

  preview: publicProcedure.input(TokenInput).query(async ({ ctx, input }) => {
    const found = await findPendingInvite(ctx.db, input.groupSlug, input.token);
    return found && invitePreview(found);
  }),

  /** Lands on the group under the account's name. The session must be the invited email. */
  accept: authedProcedure.input(v.object({ ...TokenInput.entries, name: v.optional(PersonName) })).mutation(async ({ ctx, input }) => {
    const found = await findPendingInvite(ctx.db, input.groupSlug, input.token);
    if (!found) throw new AppError('INVITE_INVALID');
    if (found.invite.email !== ctx.user.email.toLowerCase()) throw new AppError('INVITE_EMAIL_MISMATCH');
    // Before the invite is used up: without a name the person comes back to give one.
    const profile = await memberProfile(ctx.db, ctx.user.id, input.name);
    const now = new Date();
    const used = await ctx.db.invites.updateOne(
      { _id: found.invite._id, usedAt: { $exists: false } },
      { $set: { usedAt: now } }
    );
    if (used.modifiedCount === 0) throw new AppError('INVITE_INVALID');

    const { group, invite } = found;
    if (!group.members.some((m) => m.userId === ctx.user.id && placeHolding.includes(m.status))) {
      await ctx.db.groups.updateOne(
        { _id: group._id, members: { $elemMatch: { id: invite.memberId, status: 'invited' } } },
        {
          $set: {
            'members.$.userId': ctx.user.id,
            'members.$.status': 'joined',
            'members.$.name': profile.name,
            ...(profile.avatarColor && { 'members.$.avatarColor': profile.avatarColor }),
            'members.$.joinedAt': now,
            updatedAt: now,
          },
        }
      );
      await addToCurrentEdition(ctx.db, group._id, invite.memberId);
    }
    return { slug: group.slug };
  }),

  /** No account needed: the token proves the invited email (48). */
  decline: publicProcedure.input(TokenInput).mutation(async ({ ctx, input }) => {
    const found = await findPendingInvite(ctx.db, input.groupSlug, input.token);
    if (!found) throw new AppError('INVITE_INVALID');
    await ctx.db.invites.updateOne({ _id: found.invite._id }, { $set: { usedAt: new Date() } });
    const { group, invite } = found;
    if (group.members.some((m) => m.id === invite.memberId && m.status === 'invited')) {
      await removeMember(ctx.db, group, invite.memberId, 'declined');
    }
    return { ok: true };
  }),
});
