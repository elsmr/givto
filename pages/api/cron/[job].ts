import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'node:crypto';
import * as v from 'valibot';
import { Id } from '../../../lib/schema/common';
import { getDb } from '../../../lib/server/db';
import { requireEnv } from '../../../lib/server/env';
import { jobs } from '../../../lib/server/jobs';
import { log } from '../../../lib/server/log';
import { testHooksEnabled } from '../../../lib/server/test-hooks';

const digest = (text: string) => createHash('sha256').update(text).digest();

/** Vercel Schedules send `Authorization: Bearer $CRON_SECRET`; tests and manual runs do the same. */
const isAuthorized = (req: NextApiRequest) =>
  timingSafeEqual(digest(req.headers.authorization ?? ''), digest(`Bearer ${requireEnv('CRON_SECRET')}`));

/** Tests only (lib/server/test-hooks.ts), as a JSON body: the job at a chosen time, for the test's own editions and groups (JobScope). */
const TestRun = v.object({
  now: v.optional(v.pipe(v.string(), v.isoTimestamp())),
  editionIds: v.optional(v.array(Id)),
  groupIds: v.optional(v.array(Id)),
});

export default async function cronHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).end();
    return;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ ok: false });
    return;
  }
  const name = String(req.query.job);
  const job = Object.hasOwn(jobs, name) ? jobs[name] : undefined;
  if (!job) {
    res.status(404).json({ ok: false });
    return;
  }
  // Without the test hooks (production) the body is never read: jobs run at the real time, on everything.
  const testRun = testHooksEnabled() && req.body ? v.parse(TestRun, req.body) : undefined;
  const { now, ...scope } = testRun ?? {};
  const started = performance.now();
  const result = await job(await getDb(), now ? new Date(now) : new Date(), testRun && scope);
  log.info({ job: name, result, durationMs: Math.round(performance.now() - started) }, 'cron job done');
  res.status(200).json({ ok: true, job: name, result });
}
