import { buttonVariants } from '@/components/ui/button';
import type { CurrentUser } from '@/lib/client/session';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** Public pages: into the app when signed in, else sign in. */
export const MainNav = ({ user }: { user: CurrentUser | null }) => {
  const t = useTranslations('shell');

  return (
    <nav aria-label={t('main-navigation')} className="flex items-center gap-4">
      {user ? (
        <Link href="/app" prefetch={false} className={buttonVariants({ variant: 'neutral' })}>
          {t('home')}
        </Link>
      ) : (
        <Link href="/auth/sign-in" prefetch={false} className={buttonVariants()}>
          {t('sign-in')}
        </Link>
      )}
    </nav>
  );
};
