import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash, timingSafeEqual } from 'node:crypto';
import { getDb } from '../../../lib/server/db';
import { requireEnv } from '../../../lib/server/env';
import { jobs } from '../../../lib/server/jobs';
import { log } from '../../../lib/server/log';

const digest = (text: string) => createHash('sha256').update(text).digest();

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; tests and manual runs do the same. */
const isAuthorized = (req: NextApiRequest) =>
  timingSafeEqual(digest(req.headers.authorization ?? ''), digest(`Bearer ${requireEnv('CRON_SECRET')}`));

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
  const started = performance.now();
  const result = await job(await getDb(), new Date());
  log.info({ job: name, result, durationMs: Math.round(performance.now() - started) }, 'cron job done');
  res.status(200).json({ ok: true, job: name, result });
}
