import { getMongoDb } from '../db';
import { publicProcedure, router } from '../trpc';
import { accountRouter } from './account';
import { addressRouter } from './address';
import { claimRouter } from './claim';
import { drawRouter } from './draw';
import { editionRouter } from './edition';
import { giftRouter } from './gift';
import { giftdayRouter } from './giftday';
import { groupRouter } from './group';
import { guessRouter } from './guess';
import { importRouter } from './import';
import { inviteRouter } from './invite';
import { joinRouter } from './join';
import { manageRouter } from './manage';
import { meRouter } from './me';
import { membershipRouter } from './membership';
import { nudgeRouter } from './nudge';
import { questionRouter } from './question';
import { remindersRouter } from './reminders';
import { settingsRouter } from './settings';
import { tipRouter } from './tip';
import { wishRouter } from './wish';

/** Slices add their router here: `<domain>: <domain>Router` from `./<domain>`. */
export const appRouter = router({
  health: publicProcedure.query(async () => {
    await getMongoDb().command({ ping: 1 });
    return { ok: true };
  }),
  me: meRouter,
  account: accountRouter,
  wish: wishRouter,
  claim: claimRouter,
  import: importRouter,
  group: groupRouter,
  join: joinRouter,
  invite: inviteRouter,
  membership: membershipRouter,
  tip: tipRouter,
  question: questionRouter,
  nudge: nudgeRouter,
  draw: drawRouter,
  edition: editionRouter,
  settings: settingsRouter,
  giftday: giftdayRouter,
  manage: manageRouter,
  gift: giftRouter,
  guess: guessRouter,
  reminders: remindersRouter,
  address: addressRouter,
});

export type AppRouter = typeof appRouter;
