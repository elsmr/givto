import { useCurrentUser } from '@/lib/client/session';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { isPublicPath } from './public-pages';
import { localeCookie } from './remember-locale';

// Account setting is applied once per page load, so a manual switch sticks for the visit.
let appliedAccountLocale: string | undefined;

// Account setting > remembered switch > browser preference > default locale.
// Next only detects the browser language on `/`; deep links from emails and
// group chats land elsewhere, so the client applies the same rule after load.
export const usePreferredLocale = () => {
  const router = useRouter();
  const accountLocale = useCurrentUser()?.locale ?? undefined;

  useEffect(() => {
    if (!router.isReady) return;
    const { locales = [], locale, defaultLocale } = router;
    const hasRememberedLocale = document.cookie
      .split('; ')
      .some((cookie) => cookie.startsWith(`${localeCookie}=`));
    // Indexable pages keep their URL's language: crawlers (en-US) must see /nl in Dutch.
    const browserLocale = isPublicPath(router.pathname)
      ? undefined
      : (navigator.languages
          .map((language) => language.split('-')[0].toLowerCase())
          .find((language) => locales.includes(language)) ?? defaultLocale);
    const isNewAccountLocale =
      accountLocale !== undefined && accountLocale !== appliedAccountLocale;
    appliedAccountLocale = accountLocale;
    const preferred = accountLocale
      ? isNewAccountLocale
        ? accountLocale
        : undefined
      : hasRememberedLocale
        ? undefined
        : browserLocale;

    if (preferred && locales.includes(preferred) && preferred !== locale) {
      router.replace(
        { pathname: router.pathname, query: router.query },
        router.asPath,
        { locale: preferred },
      );
    }
    // Re-run on navigation and when the account arrives, not on every router update.
  }, [router.isReady, router.asPath, router.locale, accountLocale]);
};
