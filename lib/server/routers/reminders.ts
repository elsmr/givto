import * as v from 'valibot';
import { Id } from '../../schema/common';
import { AppError } from '../errors';
import { sendReminders } from '../jobs/reminders';
import { testHooksEnabled } from '../test-hooks';
import { publicProcedure, router } from '../trpc';

/** Reminders (29, 63) are sent by the scheduled jobs only; this router is their test trigger. */
export const remindersRouter = router({
  /** Tests only (lib/server/test-hooks.ts): the reminders job at a given time, for these editions and groups only. */
  runDue: publicProcedure
    .input(v.object({ now: v.pipe(v.string(), v.isoTimestamp()), editionIds: v.optional(v.array(Id)), groupIds: v.optional(v.array(Id)) }))
    .mutation(async ({ ctx, input }) => {
      if (!testHooksEnabled()) throw new AppError('NOT_FOUND');
      return sendReminders(ctx.db, new Date(input.now), { editionIds: input.editionIds ?? [], groupIds: input.groupIds ?? [] });
    }),
});
