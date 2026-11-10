import { useRequireSession } from '@/components/auth/use-require-session';
import { EmptyState } from '@/components/dashboard/empty-state';
import { GroupList } from '@/components/dashboard/group-list';
import { AppShell } from '@/components/shell/app-shell';
import { LoadFailed } from '@/components/shell/load-failed';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { loadMessages } from '@/messages/load';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import Link from 'next/link';

export default function GroupsPage() {
  const t = useTranslations('dashboard');
  const user = useRequireSession();
  const groups = useQuery({ ...useTRPC().account.groups.queryOptions(), enabled: Boolean(user) });

  return (
    <AppShell>
      <Head>
        <title>{t('page-title')}</title>
      </Head>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4 xs:flex-row xs:items-center xs:justify-between">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{t('title')}</h1>
          {groups.data && groups.data.length > 0 && (
            <Link href="/new" className={buttonVariants()}>
              <Plus aria-hidden="true" />
              {t('start')}
            </Link>
          )}
        </div>
        {groups.isError ? (
          <LoadFailed message={t('load-failed')} onRetry={() => void groups.refetch()} />
        ) : !groups.data ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : groups.data.length === 0 ? (
          <EmptyState />
        ) : (
          <GroupList groups={groups.data} />
        )}
      </div>
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['dashboard']) },
});
