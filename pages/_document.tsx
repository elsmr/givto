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
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
