import { GroupHome } from '@/components/group/group-home';
import { AppShell } from '@/components/shell/app-shell';
import { useTRPC } from '@/lib/client/trpc';
import { loadMessages } from '@/messages/load';
import { useQuery } from '@tanstack/react-query';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function GroupPage() {
  const t = useTranslations('group');
  const slug = String(useRouter().query.slug ?? '');
  // Read from the cache GroupHome fills: no request of its own.
  const group = useQuery({ ...useTRPC().group.get.queryOptions({ groupSlug: slug }), enabled: false });
  return (
    <AppShell app>
      <Head>
        <title>{`${group.data?.name ?? t('page-title')} · Givto`}</title>
      </Head>
      <GroupHome key={slug} slug={slug} />
    </AppShell>
  );
}

// One static shell per slug, built on first request; the data loads on the client.
// No database here, so the server never reveals which slugs exist (37).
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async () => ({
  props: { messages: await loadMessages('en', ['group', 'wishlist', 'between', 'draw', 'giftday', 'manage', 'guess', 'account']) },
});
