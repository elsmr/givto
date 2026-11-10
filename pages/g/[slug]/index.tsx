import { GroupHome } from '@/components/group/group-home';
import { AppShell } from '@/components/shell/app-shell';
import { loadMessages } from '@/messages/load';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function GroupPage() {
  const t = useTranslations('group');
  const slug = String(useRouter().query.slug ?? '');
  return (
    <AppShell app>
      <Head>
        <title>{`${t('page-title')} · Givto`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <GroupHome key={slug} slug={slug} />
    </AppShell>
  );
}

// One static shell per locale and slug, built on first request; the data loads on the client.
// No database here, so the server never reveals which slugs exist (37).
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['group', 'wishlist', 'between', 'draw', 'giftday', 'manage', 'guess']) },
});
