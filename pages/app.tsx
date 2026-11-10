import { useRequireSession } from '@/components/auth/use-require-session';
import { EmptyState } from '@/components/dashboard/empty-state';
import { Dashboard } from '@/components/dashboard/dashboard';
import { AppShell } from '@/components/shell/app-shell';
import { LoadFailed } from '@/components/shell/load-failed';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { loadMessages } from '@/messages/load';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import Link from 'next/link';

export default function AppHomePage() {
  const t = useTranslations('dashboard');
  const user = useRequireSession();
  const groups = useQuery({ ...useTRPC().account.groups.queryOptions(), enabled: Boolean(user), staleTime: 0 });

  return (
    <AppShell app>
      <Head>
        <title>{t('page-title')}</title>
      </Head>
      <div className="flex flex-col gap-8">
        <PageHeader
          title={user?.name ? t('hi', { name: user.name.split(' ')[0] }) : t('title')}
          actions={
            groups.data &&
            groups.data.length > 0 && (
              <Link href="/new" className={buttonVariants({ variant: 'neutral' })}>
                <Plus aria-hidden="true" />
                {t('start')}
              </Link>
            )
          }
        />
        {groups.isError ? (
          <LoadFailed message={t('load-failed')} onRetry={() => void groups.refetch()} />
        ) : !groups.data ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        ) : groups.data.length === 0 ? (
          <EmptyState />
        ) : (
          <Dashboard groups={groups.data} />
        )}
      </div>
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['dashboard', 'group']) },
});
