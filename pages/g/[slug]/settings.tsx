import { GroupSettings } from '@/components/settings/group-settings';
import { AppShell } from '@/components/shell/app-shell';
import { useTRPC } from '@/lib/client/trpc';
import { loadMessages } from '@/messages/load';
import { useQuery } from '@tanstack/react-query';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';

/** /g/[slug]/settings: organizer only; everyone else gets the group's not-found state (27). */
export default function GroupSettingsPage() {
  const t = useTranslations('settings');
  const slug = String(useRouter().query.slug ?? '');
  // Read from the cache the page's component fills: no request of its own.
  const group = useQuery({ ...useTRPC().group.get.queryOptions({ groupSlug: slug }), enabled: false });
  return (
    <AppShell app>
      <Head>
        <title>{[t('page-title'), group.data?.name, 'Givto'].filter(Boolean).join(' · ')}</title>
      </Head>
      <GroupSettings key={slug} slug={slug} />
    </AppShell>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async () => ({
  props: { messages: await loadMessages('en', ['group', 'settings', 'draw', 'create', 'guess', 'giftday']) },
});
