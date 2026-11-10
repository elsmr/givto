import { AuthCard } from '@/components/auth/auth-card';
import { SignInFlow } from '@/components/auth/sign-in-flow';
import { AppShell } from '@/components/shell/app-shell';
import { authClient, safeRedirect } from '@/lib/client/auth';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function SignInPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const redirect = safeRedirect(router.query.redirect, '/app');
  const signedIn = Boolean(authClient.useSession().data);

  useEffect(() => {
    if (signedIn && router.isReady) void router.replace(redirect);
  }, [signedIn, router, redirect]);

  return (
    <AppShell>
      <Head>
        <title>{t('page-title')}</title>
      </Head>
      <AuthCard title={t('title')} intro={t('intro')}>
        <SignInFlow redirect={redirect} />
      </AuthCard>
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['auth']) },
});
