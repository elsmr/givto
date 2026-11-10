import { FlowPage, MessageCard } from '@/components/shell/flow-page';
import { buttonVariants } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/client/session';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** Unknown, revoked, expired or used links all look the same: no hint whether the group exists. */
export const JoinUnavailable = ({ kind }: { kind: 'link' | 'invite' }) => {
  const t = useTranslations('join.unavailable');
  const user = useCurrentUser();

  return (
    <FlowPage title={t('title')}>
      <MessageCard
        actions={
          <>
            <Link href={user ? '/app' : '/auth/sign-in'} className={buttonVariants()}>
              {user ? t('my-secret-santas') : t('sign-in')}
            </Link>
            <Link href="/new" className={buttonVariants({ variant: 'neutral' })}>
              {t('start')}
            </Link>
          </>
        }
      >
        <p>{t(kind)}</p>
      </MessageCard>
    </FlowPage>
  );
};
