import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { ObjectId } from 'mongodb';
import * as v from 'valibot';
import { DeleteAccountEmail, deleteAccountSubject } from '../../../emails/delete-account';
import { PersonName } from '../../schema/common';
import type { Edition } from '../../schema/edition';
import { NotificationPrefs } from '../../schema/user';
import { deleteAccount } from '../account/delete';
import { exportAccount } from '../account/export';
import { getAuth } from '../auth';
import { AppError } from '../errors';
import { sendMail } from '../mail';
import { enforceRateLimit } from '../rate-limit';
import { authedProcedure, router } from '../trpc';

const DELETION_CODE_TTL = 10 * 60 * 1000;
const deletionIdentifier = (userId: string) => `delete-account-${userId}`;
const sha256 = (text: string) => createHash('sha256').update(text).digest();

/** The signed-in person's account (55): profile, preferences, their groups, export and deletion. */
export const accountRouter = router({
  /** The dashboard: groups I've joined, each with its latest edition. */
  groups: authedProcedure.query(async ({ ctx }) => {
    const groups = await ctx.db.groups
      .find({ deletedAt: { $exists: false }, members: { $elemMatch: { userId: ctx.user.id, status: 'joined' } } })
      .toArray();
    const editions = await ctx.db.editions
      .aggregate<{ _id: string; edition: Edition }>([
        { $match: { groupId: { $in: groups.map((group) => group._id) } } },
        { $sort: { number: -1 } },
        { $group: { _id: '$groupId', edition: { $first: '$$ROOT' } } },
      ])
      .toArray();
    const latest = new Map(editions.map(({ _id, edition }) => [_id, edition]));
    return groups.map((group) => {
      const member = group.members.find((m) => m.userId === ctx.user.id)!;
      const edition = latest.get(group._id);
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
          gifteeReady:
            (edition.status === 'drawn' || edition.status === 'giftday') &&
            Boolean(edition.draw?.assignments[member.id]),
        },
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
