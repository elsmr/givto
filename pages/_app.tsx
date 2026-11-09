import { Providers } from '@/lib/client/providers';
import * as Sentry from '@sentry/browser';
import { NextIntlClientProvider, type Messages } from 'next-intl';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { headingFont } from '../styles/fonts';
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
      <style jsx global>{`
        :root {
          --font-heading-family: ${headingFont.style.fontFamily};
        }
      `}</style>
      <Head>
        <title>Givto - Secret Santa</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="title" content="Givto - Secret Santa" />
        <meta
          name="description"
          content="Organize Secret Santa with your friends and family with ease."
        />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://givto.app/" />
        <meta property="og:title" content="Givto - Secret Santa" />
        <meta
          property="og:description"
          content="Organize Secret Santa with your friends and family with ease."
        />
        <meta property="og:image" content="/givto-logo.png" />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://givto.app/" />
        <meta property="twitter:title" content="Givto - Secret Santa" />
        <meta
          property="twitter:description"
          content="Organize Secret Santa with your friends and family with ease."
        />
        <meta property="twitter:image" content="/givto-logo.png" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/givto.webmanifest" />
        <meta name="msapplication-TileColor" content="#603cba" />
        <meta name="theme-color" content="#5A51FF"></meta>
      </Head>
      <Providers>
        <Component {...pageProps} />
      </Providers>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: `{
                "@context": "http://schema.org",
                "@type": "WebApplication",
                "name": "Givto - Secret Santa",
                "url": "https://givto.app",
                "description": "Organize Secret Santa with your friends and family with ease.",
                "genre": "family",
                "browserRequirements": "Requires JavaScript. Requires HTML5",
                "applicationCategory": "Productivity",
                "softwareVersion": "0.0.1",
                "softwareHelp": {
                  "@type": "CreativeWork",
                  "url": "https://meire.dev"
                },
                "operatingSystem": "All"
            }`,
        }}
      />
    </NextIntlClientProvider>
  );
}
