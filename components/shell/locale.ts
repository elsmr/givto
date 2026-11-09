import { useCurrentUser } from '@/lib/client/session';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const localeCookie = 'NEXT_LOCALE';

// Next's locale detection on `/` reads this cookie before Accept-Language.
export const rememberLocale = (locale: string) => {
  const secure = location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${localeCookie}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${secure}`;
};

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
    const browserLocale =
      navigator.languages
        .map((language) => language.split('-')[0].toLowerCase())
        .find((language) => locales.includes(language)) ?? defaultLocale;
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
