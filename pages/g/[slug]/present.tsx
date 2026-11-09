import { Presenter } from '@/components/giftday/presenter/presenter';
import { loadMessages } from '@/messages/load';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';

/** /g/[slug]/present: the presenter view for a shared screen on gift day (31, 32). Organizer only. */
export default function PresentPage() {
  const t = useTranslations('giftday.present');
  const slug = String(useRouter().query.slug ?? '');
  return (
    <>
      <Head>
        <title>{`${t('page-title')} · Givto`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <Presenter key={slug} groupSlug={slug} />
    </>
  );
}

// Same as /g/[slug]: one static shell per path on first request, no database (37).
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: 'blocking' });

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['giftday', 'group']) },
});
