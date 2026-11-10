import { AccountSettings } from '@/components/account/account-settings';
import { useMe } from '@/components/account/use-me';
import { useRequireSession } from '@/components/auth/use-require-session';
import { AppShell } from '@/components/shell/app-shell';
import { LoadFailed } from '@/components/shell/load-failed';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { signOut } from '@/lib/client/session';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import Head from 'next/head';

export default function AccountPage() {
  const t = useTranslations('account');
  const tShell = useTranslations('shell');
  const user = useRequireSession();
  const me = useMe(Boolean(user));

  return (
    <AppShell app>
      <Head>
        <title>{t('page-title')}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <PageHeader
          title={t('title')}
          actions={
            <Button
              variant="neutral"
              onClick={async () => {
                await signOut();
                // A full load: drops the cached data and beats this page's sign-in redirect.
                location.assign('/');
              }}
            >
              <LogOut aria-hidden="true" />
              {tShell('sign-out')}
            </Button>
          }
        />
        {me.data ? (
          <AccountSettings me={me.data} />
        ) : me.isError && user ? (
          <LoadFailed message={t('errors.generic')} onRetry={() => void me.refetch()} />
        ) : (
          <LogoAnimation variant="loading" />
        )}
      </div>
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['account']) },
});
