import { getMongoDb } from '../db';
import { publicProcedure, router } from '../trpc';
import { meRouter } from './me';

/** Slices add their router here: `<domain>: <domain>Router` from `./<domain>`. */
export const appRouter = router({
  health: publicProcedure.query(async () => {
    await getMongoDb().command({ ping: 1 });
    return { ok: true };
  }),
  me: meRouter,
});

export type AppRouter = typeof appRouter;
