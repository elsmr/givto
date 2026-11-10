import { FlowPage, MessageCard } from '@/components/shell/flow-page';
import { buttonVariants } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** Joined via a link that needs the organizer's approval (45). */
export const JoinRequested = ({ organizer }: { organizer: string }) => {
  const t = useTranslations('join.requested');

  return (
    <FlowPage title={t('title')}>
      <MessageCard
        actions={
          <Link href="/app" className={buttonVariants()}>
            {t('my-secret-santas')}
          </Link>
        }
      >
        <p>{t('description', { organizer })}</p>
      </MessageCard>
    </FlowPage>
  );
};
