import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireEnv } from '../env';

/** Older than this, a signed webhook counts as a replay. */
const MAX_AGE_SECONDS = 15 * 60;

export interface MailgunWebhook {
  signature?: { timestamp?: string; token?: string; signature?: string };
  'event-data'?: { event?: string; severity?: string; recipient?: string };
}

/** Mailgun signs `timestamp + token` with the webhook signing key (HMAC-SHA256, hex). */
export const isSignedByMailgun = ({ signature }: MailgunWebhook, now = Date.now()): boolean => {
  const { timestamp = '', token = '', signature: given = '' } = signature ?? {};
  if (!/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > MAX_AGE_SECONDS) return false;
  const expected = createHmac('sha256', requireEnv('MAILGUN_WEBHOOK_SIGNING_KEY')).update(timestamp + token).digest('hex');
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
};

/** Permanent failures (hard bounces) and spam complaints suppress the address; the rest is noise. */
export const suppressionReason = (webhook: MailgunWebhook): 'bounce' | 'complaint' | null => {
  const event = webhook['event-data'];
  if (event?.event === 'complained') return 'complaint';
  if (event?.event === 'failed' && event.severity === 'permanent') return 'bounce';
  return null;
};
