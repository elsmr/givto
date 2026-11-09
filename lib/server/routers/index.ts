import { getMongoDb } from '../db';
import { publicProcedure, router } from '../trpc';
import { groupRouter } from './group';
import { inviteRouter } from './invite';
import { joinRouter } from './join';
import { meRouter } from './me';
import { membershipRouter } from './membership';

/** Slices add their router here: `<domain>: <domain>Router` from `./<domain>`. */
export const appRouter = router({
  health: publicProcedure.query(async () => {
    await getMongoDb().command({ ping: 1 });
    return { ok: true };
  }),
  me: meRouter,
  group: groupRouter,
  join: joinRouter,
  invite: inviteRouter,
  membership: membershipRouter,
});

export type AppRouter = typeof appRouter;
