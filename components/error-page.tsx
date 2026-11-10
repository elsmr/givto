import { GivtoLogo } from '@/components/givto-logo';
import { AppShell } from '@/components/shell/app-shell';
import { FlowPage, MessageCard } from '@/components/shell/flow-page';
import { Button, buttonVariants } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/client/session';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export const ErrorPage = ({ statusCode }: { statusCode: number }) => {
  const t = useTranslations('errors');
  const user = useCurrentUser();
  const router = useRouter();
  const isNotFound = statusCode === 404;
  const title = isNotFound ? t('not-found.title') : t('fallback.title');

  return (
    <AppShell>
      <Head>
        <title>{`${title} · Givto`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <FlowPage
        eyebrow={
          <span className="flex items-center gap-3">
            <GivtoLogo aria-hidden="true" className="size-12 -rotate-12" />
            {t('status', { code: statusCode })}
          </span>
        }
        title={title}
      >
        <MessageCard
          actions={
            <>
              {!isNotFound && <Button onClick={() => router.reload()}>{t('try-again')}</Button>}
              <Link href={user ? '/app' : '/'} className={buttonVariants({ variant: isNotFound ? 'default' : 'neutral' })}>
                {t('home')}
              </Link>
              {!user && (
                <Link href="/auth/sign-in" className={buttonVariants({ variant: 'neutral' })}>
                  {t('sign-in')}
                </Link>
              )}
            </>
          }
        >
          <p>{isNotFound ? t('not-found.description') : t('fallback.description')}</p>
          {isNotFound && !user && <p className="text-base text-muted">{t('invite-hint')}</p>}
        </MessageCard>
      </FlowPage>
    </AppShell>
  );
};
