import { useCurrentUser } from '@/lib/client/session';
import { locales, type Locale } from '@/lib/schema/common';
import { useRouter } from 'next/router';
import { createContext, useContext, useEffect, useState } from 'react';
import { publicPathOf } from './public-pages';
import { browserLocale, rememberLocale } from './remember-locale';

const isLocale = (value: string | undefined): value is Locale => locales.includes(value as Locale);

/**
 * The language of app pages, which have none in the URL (81). Null until the browser is known
 * (the first render matches the English static HTML). A server-rendered page (join) brings its own.
 */
export const useClientLocaleState = (serverLocale: Locale | undefined) => {
  const [locale, setLocale] = useState<Locale | null>(serverLocale ?? null);
  useEffect(() => {
    if (!locale) setLocale(browserLocale());
  }, []);
  return [locale, setLocale] as const;
};

export const ClientLocale = createContext<(locale: Locale) => void>(() => undefined);

// Applied once per account value per page load, so a manual switch sticks even if saving it failed.
let appliedAccountLocale: string | undefined;

/**
 * The account's language wins once the session arrives, and is remembered so the next load
 * paints in it from the start. Marketing pages keep their URL's language: crawlers must see /nl in Dutch.
 */
export const usePreferredLocale = () => {
  const setLocale = useContext(ClientLocale);
  const isPublicPage = Boolean(publicPathOf(useRouter().pathname));
  const accountLocale = useCurrentUser()?.locale ?? undefined;

  useEffect(() => {
    if (isPublicPage || !isLocale(accountLocale) || accountLocale === appliedAccountLocale) return;
    appliedAccountLocale = accountLocale;
    rememberLocale(accountLocale);
    setLocale(accountLocale);
  }, [isPublicPage, accountLocale]);
};
