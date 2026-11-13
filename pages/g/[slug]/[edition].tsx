import { GroupHome } from '@/components/group/group-home';
import { PastEditionNotice } from '@/components/group/past-edition-notice';
import { AppShell } from '@/components/shell/app-shell';
import { useTRPC } from '@/lib/client/trpc';
import { loadMessages } from '@/messages/load';
import { useQuery } from '@tanstack/react-query';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';

/** /g/[slug]/[edition]: a specific (usually earlier) edition, same page as the group home (33). */
export default function EditionPage() {
  const t = useTranslations('group');
  const { query } = useRouter();
  const slug = String(query.slug ?? '');
  const editionNumber = Number(query.edition);
  const valid = Number.isInteger(editionNumber) && editionNumber >= 1;
  // Read from the cache GroupHome fills: no request of its own.
  const group = useQuery({ ...useTRPC().group.get.queryOptions({ groupSlug: slug, editionNumber }), enabled: false });
  return (
    <AppShell app>
      <Head>
        <title>{`${group.data?.name ?? t('page-title')} · Givto`}</title>
      </Head>
      {valid ? <GroupHome key={`${slug}/${editionNumber}`} slug={slug} editionNumber={editionNumber} /> : <PastEditionNotice slug={slug} />}
    </AppShell>
  );
}

// Same as /g/[slug]: one static shell per path on first request, no database (37).
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async () => ({
  props: { messages: await loadMessages('en', ['group', 'wishlist', 'between', 'draw', 'giftday', 'manage', 'guess', 'account']) },
});
