import { useSetLocale } from '@/components/account/use-set-locale';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { locales, type Locale } from '@/lib/schema/common';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';

// Endonyms: each language is named in itself, whatever the UI language.
const localeNames: Record<string, string> = {
  en: 'English',
  nl: 'Nederlands',
};

export const LanguageSwitch = () => {
  const t = useTranslations('shell');
  const router = useRouter();
  const setLocale = useSetLocale();

  return (
    <div className="flex items-center gap-3">
      <Label htmlFor="language-switch">{t('language')}</Label>
      <NativeSelect
        id="language-switch"
        value={router.locale}
        onChange={(event) => {
          const locale = event.target.value as Locale;
          if (locales.includes(locale)) void setLocale(locale);
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
