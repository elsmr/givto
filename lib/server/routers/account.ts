import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { ObjectId } from 'mongodb';
import * as v from 'valibot';
import { DeleteAccountEmail, deleteAccountSubject } from '../../../emails/delete-account';
import { PersonName } from '../../schema/common';
import type { Edition } from '../../schema/edition';
import { MIN_PARTICIPANTS } from '../../schema/group';
import { NotificationPrefs } from '../../schema/user';
import { deleteAccount } from '../account/delete';
import { exportAccount } from '../account/export';
import { getAuth } from '../auth';
import { isAfterDrawOpen, ownAndManagedIds } from '../between/santa-role';
import { AppError } from '../errors';
import { sendMail } from '../mail';
import { enforceRateLimit } from '../rate-limit';
import { authedProcedure, router } from '../trpc';
import { listWishes } from '../wishlist/wish-view';

const DELETION_CODE_TTL = 10 * 60 * 1000;
const deletionIdentifier = (userId: string) => `delete-account-${userId}`;
const sha256 = (text: string) => createHash('sha256').update(text).digest();

/** The signed-in person's account (55): profile, preferences, their groups, export and deletion. */
export const accountRouter = router({
  /** The dashboard: groups I've joined, each with its latest edition and my to-dos there. */
  groups: authedProcedure.query(async ({ ctx }) => {
    const groups = await ctx.db.groups
      .find({ deletedAt: { $exists: false }, members: { $elemMatch: { userId: ctx.user.id, status: 'joined' } } })
      .toArray();
    const [editions, wishes] = await Promise.all([
      ctx.db.editions
        .aggregate<{ _id: string; edition: Edition }>([
          { $match: { groupId: { $in: groups.map((group) => group._id) } } },
          { $sort: { number: -1 } },
          { $group: { _id: '$groupId', edition: { $first: '$$ROOT' } } },
        ])
        .toArray(),
      listWishes(ctx.db, ctx.user.id),
    ]);
    const latest = new Map(editions.map(({ _id, edition }) => [_id, edition]));
    const memberOf = (group: (typeof groups)[number]) => group.members.find((m) => m.userId === ctx.user.id)!;
    const ownIdsByGroup = new Map(groups.map((group) => [group._id, ownAndManagedIds(group, memberOf(group))]));
    const questionEditions = editions.filter(({ edition }) => isAfterDrawOpen(edition));
    // Same filter as question.forMe (delivered only), narrowed to unanswered.
    const questions =
      questionEditions.length === 0
        ? []
        : await ctx.db.questions
          .find(
            {
              editionId: { $in: questionEditions.map(({ edition }) => edition._id) },
              gifteeMemberId: { $in: questionEditions.flatMap(({ _id }) => ownIdsByGroup.get(_id) ?? []) },
              notifyAfter: { $lte: new Date() },
              answer: { $exists: false },
            },
            { projection: { editionId: 1, askerMemberId: 1 } }
          )
          .toArray();
    return groups.map((group) => {
      const member = memberOf(group);
      const edition = latest.get(group._id);
      const isOrganizer = member.role === 'organizer';
      const participantCount =
        edition?.participants.filter((p) => p.participates && p.status === 'joined').length ?? 0;
      const ownIds = ownIdsByGroup.get(group._id) ?? [];
      const unanswered = questions.filter(
        (q) => q.editionId === edition?._id && !ownIds.includes(q.askerMemberId)
      ).length;
      const hidden = new Set(member.wishlistView?.hiddenWishIds ?? []);
      const visibleWishCount = wishes.filter((wish) => !hidden.has(wish._id)).length;
      const joinRequests = group.members.filter((m) => m.status === 'requested').length;
      const status = edition?.status;
      const todos = group.archivedAt
        ? []
        : [
            isOrganizer && joinRequests > 0 && { kind: 'joinRequests' as const, count: joinRequests },
            isOrganizer && status === 'draft' && { kind: 'draft' as const },
            isOrganizer &&
              status === 'open' &&
              participantCount >= MIN_PARTICIPANTS &&
              !edition?.drawAt && { kind: 'readyToDraw' as const },
            unanswered > 0 && { kind: 'question' as const, count: unanswered },
            (status === 'open' || status === 'drawn') && visibleWishCount === 0 && { kind: 'noWishes' as const },
            status === 'giftday' && { kind: 'giftDay' as const },
            status === 'done' && visibleWishCount > 0 && { kind: 'markReceived' as const, count: visibleWishCount },
          ].filter((todo) => todo !== false);
      return {
        slug: group.slug,
        name: group.name,
        role: member.role,
        archived: Boolean(group.archivedAt),
        edition: edition && {
          number: edition.number,
          title: edition.title,
          status: edition.status,
          giftDay: edition.giftDay?.date,
          timeZone: edition.timeZone,
          participantCount,
          gifteeReady:
            (edition.status === 'drawn' || edition.status === 'giftday') &&
            Boolean(edition.draw?.assignments[member.id]),
        },
        todos,
      };
    });
  }),

  setName: authedProcedure.input(v.object({ name: PersonName })).mutation(async ({ ctx, input }) => {
    await ctx.db.users.updateOne(
      { _id: new ObjectId(ctx.user.id) },
      { $set: { name: input.name, updatedAt: new Date() } }
    );
    return { name: input.name };
  }),

  setNotifications: authedProcedure.input(NotificationPrefs).mutation(async ({ ctx, input }) => {
    await ctx.db.users.updateOne(
      { _id: new ObjectId(ctx.user.id) },
      { $set: { notifications: input, updatedAt: new Date() } }
    );
    return input;
  }),

  export: authedProcedure.query(async ({ ctx }) => {
    const data = await exportAccount(ctx.db, ctx.user.id);
    if (!data) throw new AppError('UNAUTHENTICATED');
    return data;
  }),

  /** Emails a 6-digit code that `delete` needs. */
  requestDeletion: authedProcedure.mutation(async ({ ctx }) => {
    await enforceRateLimit(`account-delete-request:${ctx.user.id}`, { window: 15 * 60, max: 3 });
    const code = String(randomInt(1_000_000)).padStart(6, '0');
    const { internalAdapter } = await getAuth().$context;
    await internalAdapter.deleteVerificationByIdentifier(deletionIdentifier(ctx.user.id));
    await internalAdapter.createVerificationValue({
      identifier: deletionIdentifier(ctx.user.id),
      value: sha256(code).toString('hex'),
      expiresAt: new Date(Date.now() + DELETION_CODE_TTL),
    });
    const locale = ctx.user.locale ?? 'en';
    await sendMail({
      to: ctx.user.email,
      subject: deleteAccountSubject(locale),
      body: DeleteAccountEmail({ locale, code }),
    });
    return { sent: true };
  }),

  delete: authedProcedure
    .input(v.object({ code: v.pipe(v.string(), v.regex(/^\d{6}$/, 'invalid_code')) }))
    .mutation(async ({ ctx, input }) => {
      await enforceRateLimit(`account-delete:${ctx.user.id}`, { window: 15 * 60, max: 5 });
      const { internalAdapter } = await getAuth().$context;
      const pending = await internalAdapter.findVerificationValue(deletionIdentifier(ctx.user.id));
      const matches =
        pending !== null &&
        pending.expiresAt > new Date() &&
        timingSafeEqual(Buffer.from(pending.value, 'hex'), sha256(input.code));
      if (!matches || !(await internalAdapter.consumeVerificationValue(deletionIdentifier(ctx.user.id)))) {
        throw new AppError('INVALID_CODE');
      }
      await deleteAccount(ctx.db, ctx.user);
      ctx.log.info('account deleted');
      return { deleted: true };
    }),
});
