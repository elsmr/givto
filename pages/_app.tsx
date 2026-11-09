import { ThemeProvider } from '@emotion/react';
import { theme } from '@givto/frontend/theme';
import { NextIntlClientProvider } from 'next-intl';
import type { AppProps } from 'next/app';
import { Providers } from '../lib/client/providers';

// Minimal stand-in so this branch builds; F2 owns the real _app.
export default function GivtoApp({ Component, pageProps, router }: AppProps) {
  return (
    <NextIntlClientProvider locale={router.locale ?? 'en'} messages={pageProps.messages ?? {}}>
      <ThemeProvider theme={theme}>
        <Providers>
          <Component {...pageProps} />
        </Providers>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
