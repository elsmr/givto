import { AuthCard } from '@/components/auth/auth-card';
import { SignInFlow } from '@/components/auth/sign-in-flow';
import { useMagicLinkSignIn } from '@/components/auth/use-magic-link-sign-in';
import { AppShell } from '@/components/shell/app-shell';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';

/** Where the emailed sign-in link lands (token in the URL fragment). */
export default function MagicLinkPage() {
  const t = useTranslations('auth');
  const { failed, callbackURL } = useMagicLinkSignIn();

  return (
    <AppShell>
      <Head>
        <title>{t('link.page-title')}</title>
        <meta name="referrer" content="no-referrer" />
      </Head>
      {failed ? (
        <AuthCard title={t('link.invalid-title')} intro={t('link.invalid')}>
          <SignInFlow redirect={callbackURL} />
        </AuthCard>
      ) : (
        <div className="flex flex-col items-center gap-4 py-16">
          <LogoAnimation variant="loading" />
          <p className="text-lg font-semibold">{t('link.signing-in')}</p>
        </div>
      )}
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async () => ({
  props: { messages: await loadMessages('en', ['auth']) },
});
