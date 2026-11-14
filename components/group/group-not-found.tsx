import { FlowPage, MessageCard } from '@/components/shell/flow-page';
import { Button, buttonVariants } from '@/components/ui/button';
import { authClient } from '@/lib/client/auth';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/router';

/** Unknown slug and not-a-member look the same (memberProcedure); offer a way on. */
export const GroupNotFound = () => {
  const t = useTranslations('group.not-found');
  const router = useRouter();
  const switchAccount = async () => {
    await authClient.signOut();
    await router.replace(`/auth/sign-in?redirect=${encodeURIComponent(router.asPath)}`);
  };

  return (
    <FlowPage title={t('title')}>
      <MessageCard
        actions={
          <>
            <Link href="/app" className={buttonVariants()}>
              {t('my-secret-santas')}
            </Link>
            <Button variant="neutral" onClick={() => void switchAccount()}>
              {t('switch-account')}
            </Button>
          </>
        }
      >
        <p>{t('description')}</p>
      </MessageCard>
    </FlowPage>
  );
};
