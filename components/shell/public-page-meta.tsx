import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { publicPages, publicUrl, siteUrl, type PublicPath } from './public-pages';

const ogLocales: Record<string, string> = { en: 'en_US', nl: 'nl_NL' };

// Title, description, canonical, hreflang and social cards for indexable pages (37).
// Those pages load the `seo` messages.
export const PublicPageMeta = ({ pathname }: { pathname: PublicPath }) => {
  const t = useTranslations('seo');
  const { locale = 'en', locales = [], defaultLocale = 'en' } = useRouter();
  const page = publicPages[pathname];
  const title = t(`${page}.title`);
  const description = t(`${page}.description`);
  const url = publicUrl(pathname, locale, defaultLocale);
  const image = `${siteUrl}/og-image.png`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {locales.map((alternate) => (
        <link
          key={alternate}
          rel="alternate"
          hrefLang={alternate}
          href={publicUrl(pathname, alternate, defaultLocale)}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={publicUrl(pathname, defaultLocale, defaultLocale)}
      />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Givto" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:locale" content={ogLocales[locale] ?? locale} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={t('image-alt')} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={t('image-alt')} />
    </Head>
  );
};
