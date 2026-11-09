import { useTranslations } from 'next-intl';
import { LanguageSwitch } from './language-switch';

export const Footer = () => {
  const t = useTranslations('shell');

  return (
    <footer className="border-t-(length:--border-width) border-ink bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <LanguageSwitch />
        <a href="https://github.com/elsmr/givto" className="font-semibold">
          {t('source-code')}
        </a>
      </div>
    </footer>
  );
};
