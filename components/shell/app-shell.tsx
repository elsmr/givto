import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { ViewTransition, type ReactNode } from 'react';
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

// Named, because React only runs enter/exit for a ViewTransition with no DOM element above it in
// the swapped tree; each page has one <main>, so the old and new ones always pair up.
const Main = ({ wide, children }: { wide: boolean; children: ReactNode }) => (
  <ViewTransition name="page" share="page" default="none">
    <main
      id="main"
      tabIndex={-1}
      className={cn('w-full flex-1 outline-none', !wide && 'mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12')}
    >
      {children}
    </main>
  </ViewTransition>
);

/**
 * `app`: a signed-in page, with the app navigation. It doesn't depend on the session, so it
 * renders before the session loads. Otherwise the public header and footer. One tree for both, so
 * a page that switches (signing in on /new) keeps its state. `wide`: edge to edge, the page sets its own width.
 */
export const AppShell = ({ app = false, wide = false, children }: { app?: boolean; wide?: boolean; children: ReactNode }) => {
  usePreferredLocale();

  return (
    <div className={cn('flex min-h-dvh flex-col', app && 'md:flex-row')}>
      <SkipLink />
      {app ? (
        <header className="border-b-(length:--border-width) border-outline bg-surface px-4 md:hidden">
          <div className="flex h-14 items-center">
            <LogoLink href="/app" />
          </div>
        </header>
      ) : (
        <Header />
      )}
      {app && <AppNav className="order-last md:order-first" />}
      <div className="flex min-w-0 flex-1 flex-col">
        <Main wide={wide}>{children}</Main>
        {!app && <Footer />}
      </div>
    </div>
  );
};
