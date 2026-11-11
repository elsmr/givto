import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Field, FieldLabel } from '@/components/ui/field';
import { locales, type Locale } from '@/lib/schema/common';
import { useLocale, useTranslations } from 'next-intl';
import { useSetLocale } from './use-set-locale';

const localeNames: Record<Locale, string> = { en: 'English', nl: 'Nederlands' };

export const LanguageSelect = () => {
  const t = useTranslations('account');
  const locale = useLocale();
  const setLocale = useSetLocale();

  return (
    <Field>
      <FieldLabel htmlFor="account-language" hint={t('language.description')}>{t('language.label')}</FieldLabel>
      <NativeSelect
        id="account-language"
        value={locale}
        onChange={(event) => void setLocale(event.target.value as Locale)}
      >
        {locales.map((locale) => (
          <NativeSelectOption key={locale} value={locale} lang={locale}>
            {localeNames[locale]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
};
