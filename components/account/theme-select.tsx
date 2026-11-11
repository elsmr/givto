import { FieldLegend, FieldSet } from '@/components/ui/field';
import { tabsListVariants } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { applyTheme, storedTheme, storeTheme, themeChoices, type ThemeChoice } from './theme';

const icons = { system: Monitor, light: Sun, dark: Moon };

/** Native radios (one choice, arrow keys) drawn as the segmented control. */
export const ThemeSelect = () => {
  const t = useTranslations('account');
  // 'system' on the server and first render; the stored choice after mount.
  const [choice, setChoice] = useState<ThemeChoice>('system');
  useEffect(() => setChoice(storedTheme()), []);

  const choose = (next: ThemeChoice) => {
    const update = () =>
      flushSync(() => {
        storeTheme(next);
        applyTheme();
        setChoice(next);
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
      <div className={cn(tabsListVariants({ variant: 'segmented' }), 'flex w-full items-stretch')}>
        {themeChoices.map((option) => {
          const Icon = icons[option];
          return (
            <label
              key={option}
              className="relative flex min-h-11 flex-1 basis-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-2 border-transparent px-1 py-1.5 text-center text-xs leading-tight font-bold not-has-checked:hover:bg-surface has-checked:-translate-x-0.5 has-checked:-translate-y-0.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid sm:flex-row sm:gap-2 sm:text-sm"
            >
              <input
                type="radio"
                name="theme"
                value={option}
                checked={choice === option}
                onChange={() => choose(option)}
                className="sr-only"
              />
              {choice === option && (
                <span
                  aria-hidden="true"
                  className="absolute -inset-0.5 border-2 border-outline bg-surface shadow-sm"
                  style={{ viewTransitionName: 'theme-choice' }}
                />
              )}
              {/* Its own layer, painted after the highlight's, so the label stays on top while it slides. */}
              <span
                className="relative flex flex-col items-center gap-0.5 sm:flex-row sm:gap-2"
                style={{ viewTransitionName: `theme-${option}` }}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                {t(`theme.${option}`)}
              </span>
            </label>
          );
        })}
      </div>
    </FieldSet>
  );
};
