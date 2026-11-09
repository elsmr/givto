/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';

// Minimal on purpose, like sign-in.tsx; the email slice (S7) restyles it.
const copy = {
  en: {
    subject: 'Confirm deleting your Givto account',
    intro: 'Here’s your code to delete your Givto account:',
    effect: 'This removes your wishlist, your memberships, tips and questions. It can’t be undone.',
    expiry: 'The code works once and expires in 10 minutes.',
    ignore: 'Didn’t ask for this? Then you can ignore this email; nothing changes.',
  },
  nl: {
    subject: 'Bevestig het verwijderen van je Givto-account',
    intro: 'Hier is je code om je Givto-account te verwijderen:',
    effect: 'Dit verwijdert je verlanglijstje, je groepen, tips en vragen. Dat kan niet ongedaan worden gemaakt.',
    expiry: 'De code werkt één keer en verloopt na 10 minuten.',
    ignore: 'Niet aangevraagd? Dan kun je deze e-mail negeren; er verandert niets.',
  },
} satisfies Record<Locale, Record<string, string>>;

export const deleteAccountSubject = (locale: Locale) => copy[locale].subject;

export const DeleteAccountEmail = ({ locale, code }: { locale: Locale; code: string }) => {
  const t = copy[locale];
  return (
    <html lang={locale}>
      <body>
        <p>{t.intro}</p>
        <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4 }}>{code}</p>
        <p>{t.effect}</p>
        <p>{t.expiry}</p>
        <p>{t.ignore}</p>
      </body>
    </html>
  );
};
