import { getMongoDb } from '../db';
import { publicProcedure, router } from '../trpc';
import { accountRouter } from './account';
import { groupRouter } from './group';
import { inviteRouter } from './invite';
import { joinRouter } from './join';
import { betweenRouters } from './between';
import { meRouter } from './me';
import { wishlistRouters } from './wishlist';
import { membershipRouter } from './membership';
import { drawRouters } from './draw-routers';
import { giftdayRouter } from './giftday';
import { manageRouter } from './manage';
import { giftRouter } from './gift';
import { guessRouter } from './guess';
import { remindersRouter } from './reminders';

/** Slices add their router here: `<domain>: <domain>Router` from `./<domain>`. */
export const appRouter = router({
  health: publicProcedure.query(async () => {
    await getMongoDb().command({ ping: 1 });
    return { ok: true };
  }),
  me: meRouter,
  account: accountRouter,
  ...wishlistRouters,
  group: groupRouter,
  join: joinRouter,
  invite: inviteRouter,
  membership: membershipRouter,
  ...betweenRouters,
  ...drawRouters,
  giftday: giftdayRouter,
  manage: manageRouter,
  gift: giftRouter,
  guess: guessRouter,
  reminders: remindersRouter,
});

export type AppRouter = typeof appRouter;
