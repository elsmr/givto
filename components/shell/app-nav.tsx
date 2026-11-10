import { GivtoLogo } from '@/components/givto-logo';
import { cn } from '@/lib/utils';
import { CircleUser, Heart, House } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/router';

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
        'md:top-0 md:h-dvh md:w-24 md:shrink-0 md:border-t-0 md:border-r-(length:--border-width) md:px-2 md:py-4',
        className,
      )}
    >
      <Link href="/app" className="mb-6 hidden justify-center md:flex" aria-label="Givto">
        <GivtoLogo aria-hidden="true" className="size-11 -rotate-6" />
      </Link>
      <ul className="grid grid-cols-3 gap-1.5 md:grid-cols-1 md:gap-3">
        {items.map(({ href, key, icon: Icon, match }) => {
          const active = match.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 border-2 border-transparent px-1 py-1.5 text-center text-xs leading-tight font-bold text-ink no-underline',
                  active ? '-translate-x-0.5 -translate-y-0.5 border-outline bg-yellow shadow-sm' : 'hover:bg-page',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
