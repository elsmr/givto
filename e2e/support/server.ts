// The running app's cron endpoint and its log (webServer stdout, see playwright.config.ts).
import { expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { BASE_URL, CRON_SECRET, SERVER_LOG } from '../env';

/** GET /api/cron/<job> (`tick`, `draws`, `giftday`, `deliveries`, `digests`, `reminders`, `retention`). */
export const runCron = async (job: string, { authorization = `Bearer ${CRON_SECRET}` }: { authorization?: string | null } = {}) => {
  const res = await fetch(`${BASE_URL}/api/cron/${job}`, { headers: authorization ? { authorization } : {} });
  return { status: res.status, body: await res.json().catch(() => null) };
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
