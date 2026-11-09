import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { rememberLocale } from './remember-locale';

// Endonyms: each language is named in itself, whatever the UI language.
const localeNames: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
};

export const LanguageSwitch = () => {
  const t = useTranslations('shell');
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <Label htmlFor="language-switch">{t('language')}</Label>
      <NativeSelect
        id="language-switch"
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
  );
};
