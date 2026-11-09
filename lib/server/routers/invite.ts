import * as v from 'valibot';
import { InviteEmail, inviteSubject } from '../../../emails/invite';
import { Email, PersonName } from '../../schema/common';
import { MAX_MEMBERS, Slug } from '../../schema/group';
import type { Member } from '../../schema/member';
import { newId } from '../db';
import { requireEnv } from '../env';
import { AppError } from '../errors';
import { findPendingInvite, invitePreview } from '../join-preview';
import { addToOpenEdition, hashToken, nameUserIfUnnamed, placeHolding, randomToken } from '../membership';
import { sendMail } from '../mail';
import { enforceRateLimit } from '../rate-limit';
import { authedProcedure, organizerProcedure, publicProcedure, router } from '../trpc';

const INVITE_DAYS = 7;
const INVITES_PER_USER_PER_DAY = { window: 24 * 60 * 60, max: 30 };
const INVITES_PER_GROUP_PER_DAY = { window: 24 * 60 * 60, max: 50 };

const TokenInput = v.object({ groupSlug: Slug, token: v.string() });

export const inviteRouter = router({
  /** Secondary to the join link (45): one email, single-use token bound to it, 7 days. */
  send: organizerProcedure
    .input(v.object({ name: PersonName, email: Email }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`invite:user:${ctx.user.id}`, INVITES_PER_USER_PER_DAY);
      await enforceRateLimit(`invite:group:${ctx.group._id}`, INVITES_PER_GROUP_PER_DAY);
      const account = await ctx.db.users.findOne({ email: input.email }, { projection: { locale: 1 } });
      const accountId = account?._id.toHexString();
      if (ctx.group.members.some((m) => m.userId === accountId && placeHolding.includes(m.status))) {
        throw new AppError('ALREADY_MEMBER');
      }

      const now = new Date();
      const pending = await ctx.db.invites.findOne({ groupId: ctx.group._id, email: input.email, usedAt: { $exists: false } });
      const memberId = pending?.memberId ?? newId();
      if (pending) {
        await ctx.db.invites.deleteMany({ memberId });
      } else {
        const member: Member = {
          id: memberId,
          name: input.name,
          role: 'member',
          status: 'invited',
          invitedAt: now,
          invitedBy: ctx.member.id,
          wishlistView: { includeNewWishes: true, hiddenWishIds: [] },
        };
        const added = await ctx.db.groups.updateOne(
          { _id: ctx.group._id, [`members.${MAX_MEMBERS - 1}`]: { $exists: false } },
          { $push: { members: member }, $set: { updatedAt: now } }
        );
        if (added.matchedCount === 0) throw new AppError('GROUP_FULL');
      }

      const token = randomToken();
      await ctx.db.invites.insertOne({
        _id: newId(),
        groupId: ctx.group._id,
        memberId,
        email: input.email,
        tokenHash: hashToken(token),
        createdAt: now,
        expiresAt: new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      });
      const locale = account?.locale ?? ctx.group.locale;
      const base = new URL(requireEnv('BETTER_AUTH_URL')).origin;
      const url = `${base}${locale === 'en' ? '' : `/${locale}`}/g/${ctx.group.slug}/join?invite=${token}`;
      const names = { locale, organizer: ctx.member.name, group: ctx.group.name };
      await sendMail({
        to: input.email,
        subject: inviteSubject(names),
        body: InviteEmail({ ...names, name: input.name, url }),
      });
      return { memberId };
    }),

  preview: publicProcedure.input(TokenInput).query(async ({ ctx, input }) => {
    const found = await findPendingInvite(ctx.db, input.groupSlug, input.token);
    return found && invitePreview(found);
  }),

  /** Lands on the group. The session must be the invited email. */
  accept: authedProcedure.input(TokenInput).mutation(async ({ ctx, input }) => {
    const found = await findPendingInvite(ctx.db, input.groupSlug, input.token);
    if (!found) throw new AppError('INVITE_INVALID');
    if (found.invite.email !== ctx.user.email.toLowerCase()) throw new AppError('INVITE_EMAIL_MISMATCH');
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
            'members.$.joinedAt': now,
            updatedAt: now,
          },
        }
      );
      await addToOpenEdition(ctx.db, group._id, invite.memberId);
      const name = group.members.find((m) => m.id === invite.memberId)?.name;
      if (name) await nameUserIfUnnamed(ctx.db, ctx.user.id, name);
    }
    return { slug: group.slug };
  }),

  /** No account needed: the token proves the invited email (48). */
  decline: publicProcedure.input(TokenInput).mutation(async ({ ctx, input }) => {
    const found = await findPendingInvite(ctx.db, input.groupSlug, input.token);
    if (!found) throw new AppError('INVITE_INVALID');
    const now = new Date();
    await ctx.db.invites.updateOne({ _id: found.invite._id }, { $set: { usedAt: now } });
    await ctx.db.groups.updateOne(
      { _id: found.group._id, members: { $elemMatch: { id: found.invite.memberId, status: 'invited' } } },
      { $set: { 'members.$.status': 'declined', updatedAt: now } }
    );
    return { ok: true };
  }),
});
