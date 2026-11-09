import { Field, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { applyTheme, storedTheme, storeTheme, themeChoices, type ThemeChoice } from './theme';

export const ThemeSelect = () => {
  const t = useTranslations('account');
  // 'system' on the server and first render; the stored choice after mount.
  const [choice, setChoice] = useState<ThemeChoice>('system');
  useEffect(() => setChoice(storedTheme()), []);

  return (
    <Field>
      <FieldLabel htmlFor="account-theme">{t('theme.label')}</FieldLabel>
      <NativeSelect
        id="account-theme"
        value={choice}
        onChange={(event) => {
          const next = event.target.value as ThemeChoice;
          storeTheme(next);
          applyTheme();
          setChoice(next);
        }}
      >
        {themeChoices.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {t(`theme.${option}`)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
};
