import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitch } from './language-switch';

export const Footer = () => {
  const t = useTranslations('shell');

  return (
    <footer className="border-t-(length:--border-width) border-ink bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <LanguageSwitch />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link
            href="/privacy"
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
      </div>
    </footer>
  );
};
