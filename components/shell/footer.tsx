import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { rememberLocale } from './locale';

// Endonyms: each language is named in itself, whatever the UI language.
const localeNames: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
};

export const Footer = () => {
  const t = useTranslations('shell');
  const router = useRouter();

  return (
    <footer className="border-t-(length:--border-width) border-ink bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Label htmlFor="footer-language">{t('language')}</Label>
          <NativeSelect
            id="footer-language"
            value={router.locale}
            onChange={(event) => {
              const locale = event.target.value;
              rememberLocale(locale);
              router.push(
                { pathname: router.pathname, query: router.query },
                router.asPath,
                { locale },
              );
            }}
          >
            {(router.locales ?? []).map((locale) => (
              <NativeSelectOption key={locale} value={locale} lang={locale}>
                {localeNames[locale] ?? locale}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <a href="https://github.com/elsmr/givto" className="font-semibold">
          {t('source-code')}
        </a>
      </div>
    </footer>
  );
};
