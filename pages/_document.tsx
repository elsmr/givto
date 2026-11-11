import { ThemeScript } from '@/components/account/theme-script';
import { localeScript } from '@/components/shell/remember-locale';
import { Head, Html, Main, NextScript, type DocumentProps } from 'next/document';

// A page without `locale` in its props is an English static app page: its language is the visitor's (81).
export default function Document({ __NEXT_DATA__ }: DocumentProps) {
  const locale = __NEXT_DATA__.props?.pageProps?.locale;
  return (
    <Html lang={locale ?? 'en'}>
      <Head>
        <ThemeScript />
        {!locale && <script dangerouslySetInnerHTML={{ __html: localeScript }} />}
        {/* Every page asks who's signed in; asking while the scripts load saves a round trip after them. */}
        <link rel="preload" href="/api/auth/get-session" as="fetch" crossOrigin="use-credentials" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
