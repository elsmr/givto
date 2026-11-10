import { ObjectId } from 'mongodb';
import * as v from 'valibot';
import { Locale } from '../../schema/common';
import { NotificationPrefs } from '../../schema/user';
import { AppError } from '../errors';
import { authedProcedure, router } from '../trpc';

export const meRouter = router({
  /** The signed-in person's own profile. */
  get: authedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.users.findOne({ _id: new ObjectId(ctx.user.id) });
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
  setLocale: authedProcedure
    .input(v.object({ locale: Locale }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.users.updateOne(
        { _id: new ObjectId(ctx.user.id) },
        { $set: { locale: input.locale, updatedAt: new Date() } }
      );
      return { locale: input.locale };
    }),
});
