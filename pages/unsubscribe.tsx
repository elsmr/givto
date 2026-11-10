import { AppShell } from '@/components/shell/app-shell';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { UnsubscribeCard } from '@/components/unsubscribe/unsubscribe-card';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

/** Where the footer link of reminder and notification emails lands (29, 54). No sign-in needed. */
export default function UnsubscribePage() {
  const t = useTranslations('unsubscribe');
  const router = useRouter();
  // Not `router.isReady` while rendering: without a query it's already true at hydration, unlike on the server.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(router.isReady), [router.isReady]);

  return (
    <AppShell>
      <Head>
        <title>{t('page-title')}</title>
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="no-referrer" />
      </Head>
      {ready ? <UnsubscribeCard token={String(router.query.t ?? '')} /> : <LogoAnimation variant="loading" />}
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['unsubscribe']) },
});
