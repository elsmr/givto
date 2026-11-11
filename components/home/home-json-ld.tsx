import { publicUrl } from '@/components/shell/public-pages';
import { useLocale, useTranslations } from 'next-intl';

// Structured data for the home page only (37).
export const HomeJsonLd = () => {
  const t = useTranslations('seo.home');
  const locale = useLocale();
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Givto',
    url: publicUrl('/', locale),
    description: t('description'),
    inLanguage: locale,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  };

  return (
    <script
      type="application/ld+json"
      // `<` escaped so message text can never close the script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
};
