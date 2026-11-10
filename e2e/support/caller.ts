// Calls app procedures in-process (appRouter.createCaller) as one account against any database, for
// specs that check data the running app can't see (api/migrate-v1.spec.ts). Its own node process
// because the app's modules import JSON without import attributes, which Playwright's loader refuses:
// node --import ./tests/ts-hooks.mjs e2e/support/caller.ts '{"uri","db","userId","calls":[{"path","input"}]}'
// Prints the results as one JSON array; run it with LOG_LEVEL=silent so the app's log stays out of it.
import { MongoClient, ObjectId } from 'mongodb';
import { collections } from '../../lib/server/db';
import { log } from '../../lib/server/log';
import { appRouter } from '../../lib/server/routers/index';
import type { Context } from '../../lib/server/trpc';

type Call = { path: string; input?: unknown };
const { uri, db: dbName, userId, calls } = JSON.parse(process.argv[2]) as { uri: string; db: string; userId: string; calls: Call[] };

const client = await new MongoClient(uri).connect();
try {
  const db = collections(client.db(dbName));
  const user = await db.users.findOne({ _id: new ObjectId(userId) });
  if (!user) throw new Error(`No user ${userId}`);
  const session = { user: { ...user, id: userId }, session: { id: 'caller', userId, token: 'caller', expiresAt: new Date(Date.now() + 60_000) } };
  const caller = appRouter.createCaller({ requestId: 'caller', log, db, session } as unknown as Context);
  const results: unknown[] = [];
  for (const { path, input } of calls) {
    const procedure = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], caller) as (input: unknown) => Promise<unknown>;
    results.push(await procedure(input));
  }
  console.log(JSON.stringify(results));
} finally {
  await client.close();
}
