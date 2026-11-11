import { AppHead } from '@/components/shell/app-head';
import { MotionProvider } from '@/components/shell/motion-provider';
import { publicPathOf } from '@/components/shell/public-pages';
import { ClientLocale, useClientLocaleState } from '@/components/shell/use-preferred-locale';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Providers } from '@/lib/client/providers';
import type { Locale } from '@/lib/schema/common';
import { loadMessages } from '@/messages/load';
import { NextIntlClientProvider, type Messages } from 'next-intl';
import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import '../styles/globals.css';

// Toasts only follow user actions, so the toast UI loads after the page.
const Toaster = dynamic(
  () => import('@/components/ui/toast').then((module) => module.Toaster),
  { ssr: false },
);

// Formatting default; dates tied to a group pass the group's time zone explicitly.
const timeZone = 'Europe/Brussels';

type Namespace = keyof Messages;
/** `locale`: the page's language when the server decides it (marketing pages, join); else en. */
type PageProps = { messages?: Partial<Messages>; locale?: Locale };

// Static JSON per language and namespace, so sharing it between requests on the server is harmless.
const loaded = new Map<string, unknown>();
const fromLoaded = (locale: Locale, namespaces: Namespace[]) =>
  namespaces.every((namespace) => loaded.has(`${locale}/${namespace}`))
    ? (Object.fromEntries(namespaces.map((namespace) => [namespace, loaded.get(`${locale}/${namespace}`)])) as Partial<Messages>)
    : undefined;

/**
 * The page's messages in `locale` (until it's known: the language the page was built in), loading
 * them when needed. Meanwhile the last language shown on this page, or `hidden` if only the build
 * language is there (a wrong-language paint).
 */
const usePageMessages = (locale: Locale | null, pageProps: PageProps) => {
  const namespaces = Object.keys(pageProps.messages ?? {}) as Namespace[];
  const pageLocale = pageProps.locale ?? 'en';
  for (const namespace of namespaces) loaded.set(`${pageLocale}/${namespace}`, pageProps.messages?.[namespace]);
  const wanted = locale ?? pageLocale;
  const shown = useRef<Locale | null>(null);
  const [, setLoads] = useState(0);
  const [failed, setFailed] = useState<Locale | null>(null);
  const messages = fromLoaded(wanted, namespaces);

  useEffect(() => {
    if (messages) return;
    loadMessages(wanted, namespaces).then(
      (more) => {
        for (const [namespace, value] of Object.entries(more)) loaded.set(`${wanted}/${namespace}`, value);
        setLoads((count) => count + 1);
      },
      () => setFailed(wanted),
    );
  }, [wanted, pageProps.messages]);

  if (messages) {
    if (locale) shown.current = wanted;
    return { locale: wanted, messages, hidden: false };
  }
  const previous = shown.current && fromLoaded(shown.current, namespaces);
  if (previous) return { locale: shown.current!, messages: previous, hidden: false };
  // Offline or a failed chunk: the language the page was built in beats a hidden page.
  return { locale: pageLocale, messages: pageProps.messages ?? {}, hidden: failed !== wanted };
};

export default function GivtoApp({ Component, pageProps, router }: AppProps<PageProps>) {
  const isPublicPage = Boolean(publicPathOf(router.pathname));
  const [clientLocale, setClientLocale] = useClientLocaleState(isPublicPage ? undefined : pageProps.locale);
  const page = usePageMessages(isPublicPage ? (pageProps.locale ?? 'en') : clientLocale, pageProps);

  useEffect(() => {
    document.documentElement.lang = page.locale;
  }, [page.locale]);
  // Before the language is known, the inline localeScript decided whether the page is hidden.
  useLayoutEffect(() => {
    if (clientLocale) document.documentElement.toggleAttribute('data-locale-pending', page.hidden);
  }, [clientLocale, page.hidden]);

  return (
    <ClientLocale.Provider value={setClientLocale}>
      <NextIntlClientProvider
        locale={page.locale}
        messages={page.messages}
        timeZone={timeZone}
      >
        <AppHead />
        <MotionProvider>
          <Providers>
            <TooltipProvider>
              <Component {...pageProps} />
            </TooltipProvider>
          </Providers>
        </MotionProvider>
        <Toaster />
      </NextIntlClientProvider>
    </ClientLocale.Provider>
  );
}
