import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { ObjectId } from 'mongodb';
import * as v from 'valibot';
import { DeleteAccountEmail, deleteAccountSubject } from '../../../emails/delete-account';
import { Id, Locale, PersonName } from '../../schema/common';
import { AvatarColor, MAX_ADDRESSES, NotificationPrefs, PostalAddress } from '../../schema/user';
import { deleteAccount } from '../account/delete';
import { exportAccount } from '../account/export';
import { accountGroups } from '../account/groups';
import { getAuth } from '../auth';
import { newId } from '../db';
import { AppError } from '../errors';
import { sendMail } from '../mail';
import { enforceRateLimit } from '../rate-limit';
import { authedProcedure, router } from '../trpc';

const DELETION_CODE_TTL = 10 * 60 * 1000;
const deletionIdentifier = (userId: string) => `delete-account-${userId}`;
const sha256 = (text: string) => createHash('sha256').update(text).digest();
const ownAccount = (userId: string) => ({ _id: new ObjectId(userId) });

/** The signed-in person's account (55): profile, preferences, address book (80), their groups, export and deletion. */
export const accountRouter = router({
  /** The signed-in person's own profile. */
  get: authedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.users.findOne(ownAccount(ctx.user.id));
    if (!user) throw new AppError('UNAUTHENTICATED');
    return {
      id: ctx.user.id,
      name: user.name,
      email: user.email,
      locale: user.locale,
      notifications: v.parse(NotificationPrefs, user.notifications ?? {}),
      avatarColor: user.avatarColor,
    };
  }),

  /** Remembers a manual language switch on the account (signed out, the NEXT_LOCALE cookie does this). */
  setLocale: authedProcedure.input(v.object({ locale: Locale })).mutation(async ({ ctx, input }) => {
    await ctx.db.users.updateOne(ownAccount(ctx.user.id), { $set: { locale: input.locale, updatedAt: new Date() } });
    return { locale: input.locale };
  }),

  groups: authedProcedure.query(({ ctx }) => accountGroups(ctx.db, ctx.user.id)),

  /** Every group shows the new name too: members carry a copy of the account's. */
  setName: authedProcedure.input(v.object({ name: PersonName })).mutation(async ({ ctx, input }) => {
    const now = new Date();
    await ctx.db.users.updateOne({ _id: new ObjectId(ctx.user.id) }, { $set: { name: input.name, updatedAt: now } });
    await ctx.db.groups.updateMany(
      { 'members.userId': ctx.user.id },
      { $set: { 'members.$[me].name': input.name, updatedAt: now } },
      { arrayFilters: [{ 'me.userId': ctx.user.id }] }
    );
    return { name: input.name };
  }),

  /** Like the name, every group shows it. */
  setAvatarColor: authedProcedure.input(v.object({ avatarColor: AvatarColor })).mutation(async ({ ctx, input }) => {
    const now = new Date();
    await ctx.db.users.updateOne({ _id: new ObjectId(ctx.user.id) }, { $set: { avatarColor: input.avatarColor, updatedAt: now } });
    await ctx.db.groups.updateMany(
      { 'members.userId': ctx.user.id },
      { $set: { 'members.$[me].avatarColor': input.avatarColor, updatedAt: now } },
      { arrayFilters: [{ 'me.userId': ctx.user.id }] }
    );
    return input;
  }),

  setNotifications: authedProcedure.input(NotificationPrefs).mutation(async ({ ctx, input }) => {
    await ctx.db.users.updateOne(
      { _id: new ObjectId(ctx.user.id) },
      { $set: { notifications: input, updatedAt: new Date() } }
    );
    return input;
  }),

  /** My address book (80). */
  addresses: authedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.users.findOne(ownAccount(ctx.user.id), { projection: { addresses: 1, defaultAddressId: 1 } });
    return { addresses: user?.addresses ?? [], defaultAddressId: user?.defaultAddressId ?? null };
  }),

  /** The first address becomes the default. */
  addAddress: authedProcedure.input(v.object({ address: PostalAddress })).mutation(async ({ ctx, input }) => {
    const id = newId();
    const added = await ctx.db.users.updateOne(
      { ...ownAccount(ctx.user.id), [`addresses.${MAX_ADDRESSES - 1}`]: { $exists: false } },
      { $push: { addresses: { id, ...input.address } }, $set: { updatedAt: new Date() } }
    );
    if (added.matchedCount === 0) throw new AppError('FORBIDDEN');
    await ctx.db.users.updateOne({ ...ownAccount(ctx.user.id), defaultAddressId: { $exists: false } }, { $set: { defaultAddressId: id } });
    return { id };
  }),

  updateAddress: authedProcedure.input(v.object({ id: Id, address: PostalAddress })).mutation(async ({ ctx, input }) => {
    const updated = await ctx.db.users.updateOne(
      { ...ownAccount(ctx.user.id), 'addresses.id': input.id },
      { $set: { 'addresses.$': { id: input.id, ...input.address }, updatedAt: new Date() } }
    );
    if (updated.matchedCount === 0) throw new AppError('NOT_FOUND');
    return { ok: true };
  }),

  /** Removing the default makes the first remaining one the default. Groups that picked it fall back to the default on read. */
  removeAddress: authedProcedure.input(v.object({ id: Id })).mutation(async ({ ctx, input }) => {
    const user = await ctx.db.users.findOneAndUpdate(
      { ...ownAccount(ctx.user.id), 'addresses.id': input.id },
      { $pull: { addresses: { id: input.id } }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after', projection: { addresses: 1, defaultAddressId: 1 } }
    );
    if (!user) throw new AppError('NOT_FOUND');
    if (user.defaultAddressId === input.id) {
      const next = user.addresses?.[0]?.id;
      await ctx.db.users.updateOne(
        { ...ownAccount(ctx.user.id), defaultAddressId: input.id },
        next ? { $set: { defaultAddressId: next } } : { $unset: { defaultAddressId: true } }
      );
    }
    return { ok: true };
  }),

  setDefaultAddress: authedProcedure.input(v.object({ id: Id })).mutation(async ({ ctx, input }) => {
    const updated = await ctx.db.users.updateOne(
      { ...ownAccount(ctx.user.id), 'addresses.id': input.id },
      { $set: { defaultAddressId: input.id, updatedAt: new Date() } }
    );
    if (updated.matchedCount === 0) throw new AppError('NOT_FOUND');
    return { ok: true };
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
