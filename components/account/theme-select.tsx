import { FieldLegend, FieldSet } from '@/components/ui/field';
import { SegmentedRadio } from '@/components/ui/segmented-radio';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { applyTheme, storedTheme, storeTheme, themeChoices, type ThemeChoice } from './theme';

const icons = { system: Monitor, light: Sun, dark: Moon };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const ThemeSelect = () => {
  const t = useTranslations('account');
  // 'system' on the server and while hydrating; the stored choice after.
  const choice = useSyncExternalStore(subscribe, storedTheme, (): ThemeChoice => 'system');

  const choose = (next: ThemeChoice) => {
    const update = () =>
      flushSync(() => {
        storeTheme(next);
        applyTheme();
        listeners.forEach((listener) => listener());
      });
    // A view transition crossfades the page into the new theme and slides the highlight across.
    if (document.startViewTransition) document.startViewTransition(update);
    else update();
  };

  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label" className="font-semibold" hint={t('theme.description')}>
        {t('theme.label')}
      </FieldLegend>
      <SegmentedRadio
        name="theme"
        transitionName="theme"
        value={choice}
        onValueChange={choose}
        options={themeChoices.map((option) => ({ value: option, label: t(`theme.${option}`), icon: icons[option] }))}
      />
    </FieldSet>
  );
};
