// Reads what the app sent through the mail mock (tests/mail-mock.mjs).
import { expect } from '@playwright/test';
import { MAIL_URL } from '../env';

export interface SentMail {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  /** Mailgun `h:*` fields, e.g. `List-Unsubscribe`. */
  headers: Record<string, string>;
  /** Mailgun `o:tag`: the kind of mail, e.g. `reminderGift` (sign-in mails have none). */
  tags: string[];
  /** Attachment file names. */
  attachments: string[];
  at: string;
}

/** Mails to `to` (oldest first), optionally only one kind (tag). */
export const mailsTo = async (to: string, kind?: string): Promise<SentMail[]> => {
  const res = await fetch(`${MAIL_URL}/messages?to=${encodeURIComponent(to)}`);
  const mails: SentMail[] = await res.json();
  return kind ? mails.filter((mail) => mail.tags.includes(kind)) : mails;
};

/** The newest mail to `to` (of `kind`), waiting up to 10s for one to arrive. */
export const latestMail = async (to: string, kind?: string): Promise<SentMail> => {
  let mails: SentMail[] = [];
  await expect
    .poll(async () => (mails = await mailsTo(to, kind)).length, { message: `a ${kind ?? ''} mail to ${to}` })
    .toBeGreaterThan(0);
  return mails.at(-1)!;
};

export interface SignInMail {
  mail: SentMail;
  /** The 6-digit code. */
  code: string;
  /** `/auth/link#token=…&callbackURL=…` */
  link: string;
  token: string;
}

/** One sign-in mail carries both ways in: a code and a link. */
export const readSignInMail = (mail: SentMail): SignInMail => {
  const code = mail.text.match(/\b(\d{6})\b/)?.[1];
  const link = mail.html.match(/href="([^"]*\/auth\/link#[^"]*)"/)?.[1]?.replaceAll('&amp;', '&');
  expect(code && link, 'code and link in one email').toBeTruthy();
  const token = new URLSearchParams(new URL(link!).hash.slice(1)).get('token')!;
  return { mail, code: code!, link: link!, token };
};
