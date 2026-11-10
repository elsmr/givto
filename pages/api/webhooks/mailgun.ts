import type { NextApiRequest, NextApiResponse } from 'next';
import * as v from 'valibot';
import { Email } from '../../../lib/schema/common';
import { getDb } from '../../../lib/server/db';
import { log } from '../../../lib/server/log';
import { isSignedByMailgun, suppressionReason, type MailgunWebhook } from '../../../lib/server/mail/mailgun-webhook';
import { suppressEmail } from '../../../lib/server/mail/suppression';

/**
 * Mailgun event webhook (54): hard bounces and complaints add the address to our suppression
 * list. 406 tells Mailgun not to retry a request we reject.
 */
export default async function mailgunWebhookHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  const webhook = (req.body ?? {}) as MailgunWebhook;
  if (!isSignedByMailgun(webhook)) {
    log.warn('mailgun webhook with a bad signature');
    res.status(406).json({ ok: false });
    return;
  }
  const reason = suppressionReason(webhook);
  const email = v.safeParse(Email, webhook['event-data']?.recipient);
  if (reason && email.success) {
    await suppressEmail(await getDb(), email.output, reason);
    log.info({ reason }, 'email suppressed');
  }
  res.status(200).json({ ok: true });
}
