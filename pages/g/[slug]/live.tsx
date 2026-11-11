import { LiveStage } from '@/components/giftday/live-stage';
import { loadMessages } from '@/messages/load';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';

/** /g/[slug]/live: members follow the presenter on their phone and guess at each turn (95). */
export default function LivePage() {
  const t = useTranslations('giftday.live');
  const slug = String(useRouter().query.slug ?? '');
  return (
    <>
      <Head>
        <title>{`${t('page-title')} · Givto`}</title>
      </Head>
      <LiveStage key={slug} groupSlug={slug} />
    </>
  );
}

// Same as /g/[slug]: one static shell per path on first request, no database (37).
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['giftday', 'group', 'guess']) },
});
