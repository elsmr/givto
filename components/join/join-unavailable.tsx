import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/client/session';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** Unknown, revoked, expired or used links all look the same: no hint whether the group exists. */
export const JoinUnavailable = ({ kind }: { kind: 'link' | 'invite' }) => {
  const t = useTranslations('join.unavailable');
  const user = useCurrentUser();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-4xl font-extrabold sm:text-5xl">{t('title')}</h1>
      <p className="text-lg">{t(kind)}</p>
      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
        <Button nativeButton={false} render={<Link href={user ? '/groups' : '/auth/sign-in'} />}>
          {user ? t('my-secret-santas') : t('sign-in')}
        </Button>
        <Button variant="neutral" nativeButton={false} render={<Link href="/new" />}>
          {t('start')}
        </Button>
      </div>
    </div>
  );
};
