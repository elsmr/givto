import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Footer } from './footer';
import { Header } from './header';
import { usePreferredLocale } from './use-preferred-locale';

export const AppShell = ({ children }: { children: ReactNode }) => {
  const t = useTranslations('shell');
  usePreferredLocale();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only bg-surface font-semibold text-ink bordered focus:not-sr-only focus:px-4 focus:py-3 focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        {t('skip-to-content')}
      </a>
      <Header />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 outline-none sm:px-6 sm:py-12"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
};
