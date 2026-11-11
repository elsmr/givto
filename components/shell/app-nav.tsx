import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { cn } from '@/lib/utils';
import { CircleUser, Heart, House } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ViewTransition } from 'react';

// Group pages and starting a group live under Home.
const items = [
  { href: '/app', key: 'home', icon: House, match: ['/app', '/g/', '/new'] },
  { href: '/wishlist', key: 'my-wishlist', icon: Heart, match: ['/wishlist'] },
  { href: '/account', key: 'account', icon: CircleUser, match: ['/account'] },
] as const;

/** Signed-in navigation: a rail on the left from md, a bar stuck to the bottom on phones. */
export const AppNav = ({ className }: { className?: string }) => {
  const t = useTranslations('shell');
  const { pathname } = useRouter();

  return (
    <nav
      aria-label={t('main-navigation')}
      className={cn(
        'sticky bottom-0 z-30 border-t-(length:--border-width) border-outline bg-surface p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]',
        'md:top-0 md:h-dvh md:w-28 md:shrink-0 md:border-t-0 md:border-r-(length:--border-width) md:px-2 md:py-4',
        className,
      )}
    >
      <Link href="/app" prefetch={false} className="mb-6 hidden justify-center md:flex" aria-label="Givto">
        <LogoAnimation variant="hover" className="size-11 -rotate-6" />
      </Link>
      <ul className="grid grid-cols-3 gap-1.5 md:grid-cols-1 md:gap-3">
        {items.map(({ href, key, icon: Icon, match }) => {
          const active = match.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                prefetch={false}
                aria-current={pathname === href ? 'page' : active ? 'true' : undefined}
                className={cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-1 border-2 border-transparent px-1 py-1.5 text-center text-xs leading-tight font-bold break-words hyphens-auto text-ink no-underline',
                  // The label sits beside the yellow highlight, not in it, so it skips the dark theme's dark-on-yellow rule.
                  active ? '-translate-x-0.5 -translate-y-0.5 text-outline' : 'hover:bg-page',
                )}
              >
                {active && (
                  // One name across pages, so the highlight slides from the old item to the new one.
                  <ViewTransition name="app-nav-active" share="auto" default="none">
                    <span aria-hidden="true" className="absolute -inset-0.5 border-2 border-outline bg-yellow shadow-sm" />
                  </ViewTransition>
                )}
                {/* Its own layer, painted after the highlight's, so the label stays on top while it slides. */}
                <span className="relative flex flex-col items-center gap-1" style={{ viewTransitionName: `app-nav-${key}` }}>
                  <Icon aria-hidden="true" className="size-5" />
                  {t(key)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
