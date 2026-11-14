import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitch } from './language-switch';
import { localePath } from './public-pages';

/** Also at the bottom of Account, since the app has no footer. */
export const SiteLinks = () => {
  const t = useTranslations('shell');
  const locale = useLocale();

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <Link
        href={localePath('/privacy', locale)}
        prefetch={false}
        className="inline-flex min-h-11 items-center font-semibold"
      >
        {t('privacy')}
      </Link>
      <a
        href="https://github.com/elsmr/givto"
        className="inline-flex min-h-11 items-center font-semibold"
      >
        {t('source-code')}
      </a>
    </div>
  );
};

export const Footer = () => (
  // Hidden while the page shows its loader at the top of main, so it comes in with the content
  // instead of being pushed down by it (layout shift). Loaders nested deeper are part of a page.
  <footer className="border-t-(length:--border-width) border-outline bg-surface [main:has(>[data-page-loading],>*>[data-page-loading])+&]:hidden">
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <LanguageSwitch />
      <SiteLinks />
    </div>
  </footer>
);
