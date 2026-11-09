import { Button } from '@/components/ui/button';
import type { CurrentUser } from '@/lib/client/session';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Signed-out pages (most visits) don't load the menu code.
const AccountMenu = dynamic(() =>
  import('./account-menu').then((module) => module.AccountMenu),
);

export const MainNav = ({ user }: { user: CurrentUser | null }) => {
  const t = useTranslations('shell');

  return (
    <nav aria-label={t('main-navigation')} className="flex items-center gap-4">
      {user ? (
        <>
          <Link
            href="/groups"
            className="hidden font-semibold text-ink xs:inline"
          >
            {t('my-secret-santas')}
          </Link>
          <AccountMenu user={user} />
        </>
      ) : (
        <Button nativeButton={false} render={<Link href="/auth/sign-in" />}>
          {t('sign-in')}
        </Button>
      )}
    </nav>
  );
};
