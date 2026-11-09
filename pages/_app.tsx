import { AppHead } from '@/components/shell/app-head';
import { Providers } from '@/lib/client/providers';
import * as Sentry from '@sentry/browser';
import { NextIntlClientProvider, type Messages } from 'next-intl';
import type { AppProps } from 'next/app';
import '../styles/globals.css';

if (typeof window !== 'undefined') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV !== 'development',
  });
}

// Formatting default; dates tied to a group pass the group's time zone explicitly.
const timeZone = 'Europe/Brussels';

export default function GivtoApp({
  Component,
  pageProps,
  router,
}: AppProps<{ messages?: Partial<Messages> }>) {
  return (
    <NextIntlClientProvider
      locale={router.locale ?? 'en'}
      messages={pageProps.messages ?? {}}
      timeZone={timeZone}
    >
      <Providers>
        <Component {...pageProps} />
      </Providers>
      <AppHead />
    </NextIntlClientProvider>
  );
}
