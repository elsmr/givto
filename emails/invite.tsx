/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';

// Minimal on purpose; the email slice (S7) restyles it. Names are validated plain text (43).
const copy = {
  en: {
    subject: (organizer: string, group: string) => `${organizer} invited you to ${group} on Givto`,
    greeting: (name: string) => `Hi ${name}!`,
    body: (organizer: string, group: string) => `${organizer} invited you to the Secret Santa “${group}”.`,
    button: 'Join the Secret Santa',
    expiry: 'This link is just for you and works once, for 7 days.',
    ignore: 'Not interested? You can decline from the same link, or ignore this email.',
  },
  nl: {
    subject: (organizer: string, group: string) => `${organizer} nodigt je uit voor ${group} op Givto`,
    greeting: (name: string) => `Hoi ${name}!`,
    body: (organizer: string, group: string) => `${organizer} nodigt je uit voor de Secret Santa “${group}”.`,
    button: 'Doe mee',
    expiry: 'Deze link is alleen voor jou en werkt één keer, 7 dagen lang.',
    ignore: 'Geen zin? Via dezelfde link kun je afzeggen, of je negeert deze e-mail.',
  },
} satisfies Record<Locale, Record<string, unknown>>;

type InviteProps = { locale: Locale; name: string; organizer: string; group: string; url: string };

export const inviteSubject = ({ locale, organizer, group }: Omit<InviteProps, 'name' | 'url'>) =>
  copy[locale].subject(organizer, group);

export const InviteEmail = ({ locale, name, organizer, group, url }: InviteProps) => {
  const t = copy[locale];
  return (
    <html lang={locale}>
      <body>
        <p>{t.greeting(name)}</p>
        <p>{t.body(organizer, group)}</p>
        <p>
          <a href={url}>{t.button}</a>
        </p>
        <p>{t.expiry}</p>
        <p>{t.ignore}</p>
      </body>
    </html>
  );
};
