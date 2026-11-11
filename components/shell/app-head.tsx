import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { HeadingFont } from './heading-font';
import { PublicPageMeta } from './public-page-meta';
import { publicPathOf } from './public-pages';

// Global <head> tags; render before the page so page titles win.
export const AppHead = () => {
  const t = useTranslations('shell');
  const publicPath = publicPathOf(useRouter().pathname);

  return (
    <>
      <HeadingFont />
      <Head>
        <title>Givto</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {!publicPath && <meta name="robots" content="noindex" />}
        {!publicPath && <meta name="description" content={t('description')} />}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/givto.webmanifest" />
        <meta name="theme-color" content="#5A51FF" />
      </Head>
      {publicPath && <PublicPageMeta pathname={publicPath} />}
    </>
  );
};
