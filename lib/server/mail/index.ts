import { render } from '@react-email/render';
import type { ReactElement } from 'react';
import { requireEnv } from '../env';

const FROM = 'Givto <no-reply@mail.givto.app>';

// Names and subjects end up in headers: never let a line break through (header injection, 43).
const oneLine = (text: string) => text.replace(/[\r\n]+/g, ' ').trim();

export interface Mail {
  to: string;
  subject: string;
  /** A React Email template; rendered to HTML and plain text. */
  body: ReactElement;
  /** One-click unsubscribe endpoint (RFC 8058): sets List-Unsubscribe and List-Unsubscribe-Post. */
  unsubscribeUrl?: string;
  /** Mailgun tag for delivery stats, e.g. `psst`. Never ids or names. */
  tag?: string;
  /** An .ics part (47), e.g. from lib/calendar's `toIcs`. */
  calendar?: { filename: string; content: string };
}

/** Sends through Mailgun's HTTP API (`MAILGUN_API_BASE` is the domain's base URL). */
export const sendMail = async ({ to, subject, body, unsubscribeUrl, tag, calendar }: Mail): Promise<void> => {
  const [html, text] = await Promise.all([render(body), render(body, { plainText: true })]);
  const form = new FormData();
  form.append('from', FROM);
  form.append('to', oneLine(to));
  form.append('subject', oneLine(subject));
  form.append('html', html);
  form.append('text', text);
  if (unsubscribeUrl) {
    form.append('h:List-Unsubscribe', `<${unsubscribeUrl}>`);
    form.append('h:List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');
  }
  if (tag) form.append('o:tag', tag);
  if (calendar) {
    form.append('attachment', new Blob([calendar.content], { type: 'text/calendar; charset=utf-8; method=PUBLISH' }), calendar.filename);
  }
  const response = await fetch(`${requireEnv('MAILGUN_API_BASE')}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${requireEnv('MAILGUN_API_KEY')}`).toString('base64')}`,
    },
    body: form,
  });
  if (!response.ok) throw new Error(`Mailgun responded ${response.status}`);
};
