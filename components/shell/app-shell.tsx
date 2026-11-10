import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { AppNav } from './app-nav';
import { Footer } from './footer';
import { Header } from './header';
import { LogoLink } from './logo-link';
import { usePreferredLocale } from './use-preferred-locale';

const SkipLink = () => {
  const t = useTranslations('shell');
  return (
    <a
      href="#main"
      className="sr-only bg-surface font-semibold text-ink bordered focus:not-sr-only focus:px-4 focus:py-3 focus:fixed focus:top-2 focus:left-2 focus:z-50"
    >
      {t('skip-to-content')}
    </a>
  );
};

const Main = ({ children }: { children: ReactNode }) => (
  <main
    id="main"
    tabIndex={-1}
    className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 outline-none sm:px-6 sm:py-12"
  >
    {children}
  </main>
);

/**
 * `app`: a signed-in page, with the app navigation. It doesn't depend on the session, so it
 * renders before the session loads. Otherwise the public header and footer.
 */
export const AppShell = ({ app = false, children }: { app?: boolean; children: ReactNode }) => {
  usePreferredLocale();

  if (!app) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SkipLink />
        <Header />
        <Main>{children}</Main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <SkipLink />
      <header className="border-b-(length:--border-width) border-outline bg-surface px-4 md:hidden">
        <div className="flex h-14 items-center">
          <LogoLink href="/app" />
        </div>
      </header>
      <AppNav className="order-last md:order-first" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Main>{children}</Main>
        <Footer language={false} />
      </div>
    </div>
  );
};
