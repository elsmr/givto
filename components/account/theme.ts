export const themeChoices = ['system', 'light', 'dark'] as const;
export type ThemeChoice = (typeof themeChoices)[number];

const THEME_KEY = 'givto-theme';

export const storedTheme = (): ThemeChoice => {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
};

export const storeTheme = (choice: ThemeChoice) => {
  if (choice === 'system') localStorage.removeItem(THEME_KEY);
  else localStorage.setItem(THEME_KEY, choice);
};

/**
 * Sets `<html data-theme>` from the stored choice or the system setting. Self-contained:
 * theme-script.tsx inlines its source to run before the first paint.
 */
export function applyTheme() {
  try {
    const stored = localStorage.getItem('givto-theme');
    const dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch {
    // Storage blocked: the light theme stays.
  }
}
