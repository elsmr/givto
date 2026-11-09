import { Button } from '@/components/ui/button';
import type { CurrentUser } from '@/lib/client/session';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AccountMenu } from './account-menu';

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
