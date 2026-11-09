import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
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
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        <CardDescription className="text-base">{intro}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {unsubscribe.isError && !invalid && (
          <Alert variant="danger">
            <AlertTitle>{t('failed')}</AlertTitle>
          </Alert>
        )}
        <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
          {!invalid && !unsubscribe.isSuccess && (
            <Button onClick={() => unsubscribe.mutate()} disabled={unsubscribe.isPending}>
              {t('confirm')}
            </Button>
          )}
          <Link href="/account" className={buttonVariants({ variant: 'neutral' })}>
            {t('settings')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
