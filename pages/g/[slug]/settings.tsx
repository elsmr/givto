import { GroupSettings } from '@/components/settings/group-settings';
import { AppShell } from '@/components/shell/app-shell';
import { loadMessages } from '@/messages/load';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';

/** /g/[slug]/settings: organizer only; everyone else gets the group's not-found state (27). */
export default function GroupSettingsPage() {
  const t = useTranslations('settings');
  const slug = String(useRouter().query.slug ?? '');
  return (
    <AppShell app>
      <Head>
        <title>{`${t('page-title')} · Givto`}</title>
      </Head>
      <GroupSettings key={slug} slug={slug} />
    </AppShell>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['group', 'settings', 'draw', 'create']) },
});
