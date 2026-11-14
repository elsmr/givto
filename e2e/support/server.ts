// The running app's cron endpoint and its log (webServer stdout, see playwright.config.ts).
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { BASE_URL, CRON_SECRET, SERVER_LOG } from '../env';

/** Test hooks (lib/server/test-hooks.ts): the job at `now` (ISO), only for these editions and groups. */
export interface TestRun {
  now?: string;
  editionIds?: string[];
  groupIds?: string[];
}

/** GET /api/cron/<job> (`tick`, `draws`, `giftday`, `deliveries`, `digests`, `reminders`, `retention`); POST with a `testRun`. */
export const runCron = async (
  job: string,
  { authorization = `Bearer ${CRON_SECRET}`, testRun }: { authorization?: string | null; testRun?: TestRun } = {}
) => {
  const headers: Record<string, string> = authorization ? { authorization } : {};
  const res = await fetch(
    `${BASE_URL}/api/cron/${job}`,
    testRun ? { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(testRun) } : { headers }
  );
  return { status: res.status, body: await res.json().catch(() => null) };
};

/** Runs a cron job and returns its result (unscoped counts cover the whole database: assert on own data instead). */
export const runJob = async (job: string, testRun?: TestRun) => {
  const { status, body } = await runCron(job, { testRun });
  expect(status, JSON.stringify(body)).toBe(200);
  return body.result;
};

export const readServerLog = () => readFileSync(SERVER_LOG, 'utf8');

/** None of `secrets` (emails, codes, tokens) is in the server log; 6-digit codes as whole words only. */
export const expectNotLogged = (secrets: string[]) => {
  const log = readServerLog();
  for (const secret of new Set(secrets.filter(Boolean))) {
    const leaked = /^\d{6}$/.test(secret) ? new RegExp(`\\b${secret}\\b`).test(log) : log.includes(secret);
    expect(leaked, `leaked into the server log: ${secret}`).toBe(false);
  }
};
