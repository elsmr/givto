import { Presenter } from '@/components/giftday/presenter/presenter';
import { useTRPC } from '@/lib/client/trpc';
import { loadMessages } from '@/messages/load';
import { useQuery } from '@tanstack/react-query';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';

/** /g/[slug]/present: the presenter view for a shared screen on gift day (31, 32). Organizer only. */
export default function PresentPage() {
  const t = useTranslations('giftday.present');
  const slug = String(useRouter().query.slug ?? '');
  // Read from the cache the page's component fills: no request of its own.
  const group = useQuery({ ...useTRPC().group.get.queryOptions({ groupSlug: slug }), enabled: false });
  return (
    <>
      <Head>
        <title>{[t('page-title'), group.data?.name, 'Givto'].filter(Boolean).join(' · ')}</title>
      </Head>
      <Presenter key={slug} groupSlug={slug} />
    </>
  );
}

// Same as /g/[slug]: one static shell per path on first request, no database (37).
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async () => ({
  props: { messages: await loadMessages('en', ['giftday', 'group', 'guess']) },
});
