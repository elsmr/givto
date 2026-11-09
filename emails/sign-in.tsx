/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';

// Minimal on purpose; the email slice (S7) restyles it.
const copy = {
  en: {
    subject: 'Sign in to Givto',
    greeting: 'Hi!',
    code: 'Here’s your code to sign in to Givto:',
    link: 'Or sign in with one click:',
    button: 'Sign in to Givto',
    expiry: 'The code and the link work once and expire in 10 minutes.',
    ignore: 'Didn’t ask for this? Then you can ignore this email.',
  },
  nl: {
    subject: 'Inloggen bij Givto',
    greeting: 'Hoi!',
    code: 'Hier is je code om in te loggen bij Givto:',
    link: 'Of log in met één klik:',
    button: 'Inloggen bij Givto',
    expiry: 'De code en de link werken één keer en verlopen na 10 minuten.',
    ignore: 'Niet aangevraagd? Dan kun je deze e-mail negeren.',
  },
} satisfies Record<Locale, Record<string, string>>;

export const signInSubject = (locale: Locale) => copy[locale].subject;

export const SignInEmail = ({ locale, otp, url }: { locale: Locale; otp: string; url: string }) => {
  const t = copy[locale];
  return (
    <html lang={locale}>
      <body>
        <p>{t.greeting}</p>
        <p>{t.code}</p>
        <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4 }}>{otp}</p>
        <p>{t.link}</p>
        <p>
          <a href={url}>{t.button}</a>
        </p>
        <p>{t.expiry}</p>
        <p>{t.ignore}</p>
      </body>
    </html>
  );
};
