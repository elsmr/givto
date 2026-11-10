import { FlowPage, MessageCard } from '@/components/shell/flow-page';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { categoryOf, useUnsubscribe } from './use-unsubscribe';

/** Asks before unsubscribing: opening the link alone changes nothing (scanners open links too). */
export const UnsubscribeCard = ({ token }: { token: string }) => {
  const t = useTranslations('unsubscribe');
  const unsubscribe = useUnsubscribe(token);
  const category = categoryOf(token);
  const invalid = !category || (unsubscribe.error && unsubscribe.error.message.endsWith('400'));
  const name = category ? t(`category.${category}`) : '';
  const [title, intro] = invalid
    ? [t('invalid-title'), t('invalid')]
    : unsubscribe.isSuccess
      ? [t('done-title'), t('done', { category: name })]
      : [t('title', { category: name }), t('intro', { category: name })];

  return (
    <FlowPage title={title}>
      <MessageCard
        actions={
          <>
            {!invalid && !unsubscribe.isSuccess && (
              <Button onClick={() => unsubscribe.mutate()} disabled={unsubscribe.isPending}>
                {t('confirm')}
              </Button>
            )}
            <Link href="/account" className={buttonVariants({ variant: 'neutral' })}>
              {t('settings')}
            </Link>
          </>
        }
      >
        <p>{intro}</p>
        {unsubscribe.isError && !invalid && (
          <Alert variant="danger">
            <AlertTitle>{t('failed')}</AlertTitle>
          </Alert>
        )}
      </MessageCard>
    </FlowPage>
  );
};
