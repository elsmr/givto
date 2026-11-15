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
import { addToCurrentEdition, currentEdition, hashToken, memberProfile, nameTaken, placeHolding, randomToken } from '../membership';
import { sendMail } from '../mail';
import { isSuppressed } from '../mail/suppression';
import { inviteUrl } from '../mail/urls';
import { consumeRateLimit, enforceRateLimit } from '../rate-limit';
import { removeMember } from '../remove-member';
import { authedProcedure, organizerProcedure, publicProcedure, router } from '../trpc';

const INVITES_PER_USER_PER_DAY = { window: 24 * 60 * 60, max: 30 };
const INVITES_PER_GROUP_PER_DAY = { window: 24 * 60 * 60, max: 50 };
/** So nobody can point Givto's mail at one person. */
const INVITES_PER_ADDRESS_PER_DAY = { window: 24 * 60 * 60, max: 3 };

const TokenInput = v.object({ groupSlug: Slug, token: v.string() });

/** An email invitee who hasn't joined: no account, not managed, and their email for a name (110). */
const invitedAs = (email: string) => ({ name: email, userId: { $exists: false }, managedBy: { $exists: false } });
const isInvitedAs = (email: string) => (m: Member) => m.name === email && !m.userId && !m.managedBy;

export const inviteRouter = router({
  /**
   * Secondary to the join link (45): one email, single-use token bound to it, 7 days. The invitee names themselves on
   * accept; until then the group sees them by their email, never an account's name (110). Before the draw they're in
   * the edition right away (98); after it, only once they accept.
   */
  send: organizerProcedure
    .input(v.object({ email: Email }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`invite:user:${ctx.user.id}`, INVITES_PER_USER_PER_DAY);
      await enforceRateLimit(`invite:group:${ctx.group._id}`, INVITES_PER_GROUP_PER_DAY);
      if (await isSuppressed(ctx.db, input.email)) throw new AppError('EMAIL_SUPPRESSED');
      const perAddress = await consumeRateLimit(`invite:address:${ctx.group._id}:${input.email}`, INVITES_PER_ADDRESS_PER_DAY);
      if (!perAddress.allowed) throw new AppError('INVITE_LIMIT');
      const account = await ctx.db.users.findOne({ email: input.email }, { projection: { locale: 1 } });
      const accountId = account?._id.toHexString();
      const accountMember = accountId ? ctx.group.members.find((m) => m.userId === accountId) : undefined;
      if (accountMember && placeHolding.includes(accountMember.status)) throw new AppError('ALREADY_MEMBER');

      const now = new Date();
      // One member per person (105): someone invited, removed or declining before gets their member back.
      const earlier = await ctx.db.invites.findOne({ groupId: ctx.group._id, email: input.email }, { sort: { createdAt: -1 } });
      const reusable = (m: Member) => !placeHolding.includes(m.status) && (!m.userId || m.userId === accountId);
      const reused =
        accountMember ??
        ctx.group.members.find((m) => (isInvitedAs(input.email)(m) || m.id === earlier?.memberId) && reusable(m));
      const memberId = reused?.id ?? newId();
      if (reused) {
        await ctx.db.invites.deleteMany({ memberId, usedAt: { $exists: false } });
        // The draw reads how long the invite runs from here (draw/rules.ts).
        await ctx.db.groups.updateOne(
          { _id: ctx.group._id, 'members.id': memberId },
          {
            // `removedAt` / `leftAt` stay until they accept: if they decline, the join link still sees them as removed or left (105).
            $set: {
              'members.$.status': 'invited',
              ...(!reused.userId && { 'members.$.name': input.email }),
              'members.$.invitedAt': now,
              'members.$.invitedBy': ctx.member.id,
              updatedAt: now,
            },
          }
        );
      } else {
        const member: Member = {
          id: memberId,
          name: input.email,
          role: 'member',
          status: 'invited',
          invitedAt: now,
          invitedBy: ctx.member.id,
          wishlistView: { shownWishIds: [] },
        };
        // Not when a send to the same address at the same moment added them first: that one invites them.
        const added = await ctx.db.groups.updateOne(
          {
            _id: ctx.group._id,
            [`members.${MAX_MEMBERS - 1}`]: { $exists: false },
            members: { $not: { $elemMatch: invitedAs(input.email) } },
          },
          { $push: { members: member }, $set: { updatedAt: now } }
        );
        if (added.matchedCount === 0) {
          const group = await ctx.db.groups.findOne({ _id: ctx.group._id }, { projection: { members: 1 } });
          const invitedJustNow = group?.members.find(isInvitedAs(input.email));
          if (!invitedJustNow) throw new AppError('GROUP_FULL');
          return { memberId: invitedJustNow.id };
        }
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
    // Before the invite is used up: without a name, or with one that's taken, the person comes back to give one.
    const profile = await memberProfile(ctx.db, ctx.user.id, input.name, (name) => nameTaken(found.group, name, found.invite.memberId));
    const mine = found.group.members.filter((m) => m.userId === ctx.user.id);
    const alreadyHere = mine.some((m) => placeHolding.includes(m.status));
    // One member per account (105): the account is another member here, declined or removed; a new invite reuses that one.
    if (!alreadyHere && mine.some((m) => m.id !== found.invite.memberId)) throw new AppError('ALREADY_MEMBER');
    const now = new Date();
    const used = await ctx.db.invites.updateOne(
      { _id: found.invite._id, usedAt: { $exists: false } },
      { $set: { usedAt: now } }
    );
    if (used.modifiedCount === 0) throw new AppError('INVITE_INVALID');

    const { group, invite } = found;
    if (!alreadyHere) {
      const joined = await ctx.db.groups.updateOne(
        {
          _id: group._id,
          members: { $elemMatch: { id: invite.memberId, status: 'invited' } },
          // One member per account (105).
          $nor: [{ members: { $elemMatch: { userId: ctx.user.id, id: { $ne: invite.memberId } } } }],
        },
        {
          $set: {
            'members.$.userId': ctx.user.id,
            'members.$.status': 'joined',
            'members.$.name': profile.name,
            ...(profile.avatarColor && { 'members.$.avatarColor': profile.avatarColor }),
            'members.$.joinedAt': now,
            updatedAt: now,
          },
          $unset: { 'members.$.removedAt': true, 'members.$.leftAt': true },
        }
      );
      if (joined.matchedCount === 0) throw new AppError('ALREADY_MEMBER');
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
