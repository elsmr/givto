import type { Locale, locales } from '@/lib/schema/common';

export const localeCookie = 'NEXT_LOCALE';

// App pages and the server (a new account's language, the join page) read this before Accept-Language.
export const rememberLocale = (locale: string) => {
  const secure = location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${localeCookie}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${secure}`;
};

/**
 * A remembered switch (`NEXT_LOCALE`: the account's language, once signed in) > browser language > en.
 * Self-contained: `localeScript` inlines its source to run before the first paint.
 */
export function browserLocale(): Locale {
  const supported: typeof locales = ['en', 'nl'];
  const cookie = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)?.[1];
  const preferred = [cookie, ...navigator.languages.map((language) => language.split('-')[0].toLowerCase())];
  return (preferred.find((language) => supported.includes(language as Locale)) as Locale | undefined) ?? 'en';
}

/**
 * For app pages, whose static HTML is English: hides the page before the first paint when the
 * visitor's language is another one, until `_app` has rendered it (`data-locale-pending`).
 */
export const localeScript = `if((${browserLocale})()!=='en')document.documentElement.setAttribute('data-locale-pending','')`;
