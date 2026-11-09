import { createTranslator } from 'next-intl';
import en from '../../messages/en/email.json';
import nl from '../../messages/nl/email.json';
import type { Locale } from '../../lib/schema/common';

const messages = { en, nl: nl as typeof en };

/**
 * Email copy lives in messages/<locale>/email.json like the UI's. A missing message throws:
 * tests/emails.check.mjs renders every template in every locale, so it fails there first.
 */
export const emailTranslator = (locale: Locale) =>
  createTranslator({
    locale,
    messages: { email: messages[locale] },
    namespace: 'email',
    onError: (error) => {
      throw error;
    },
  });
export type EmailTranslator = ReturnType<typeof emailTranslator>;
