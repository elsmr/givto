import { AppShell } from '@/components/shell/app-shell';
import { Loader } from '@/components/ui/loader';
import { UnsubscribeCard } from '@/components/unsubscribe/unsubscribe-card';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';

/** Where the footer link of reminder and notification emails lands (29, 54). No sign-in needed. */
export default function UnsubscribePage() {
  const t = useTranslations('unsubscribe');
  const router = useRouter();

  return (
    <AppShell>
      <Head>
        <title>{t('page-title')}</title>
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="no-referrer" />
      </Head>
      {router.isReady ? <UnsubscribeCard token={String(router.query.t ?? '')} /> : <Loader />}
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['unsubscribe']) },
});
