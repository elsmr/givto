import { AccountSettings } from '@/components/account/account-settings';
import { useMe } from '@/components/account/use-me';
import { useRequireSession } from '@/components/auth/use-require-session';
import { AppShell } from '@/components/shell/app-shell';
import { LoadFailed } from '@/components/shell/load-failed';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';

export default function AccountPage() {
  const t = useTranslations('account');
  const user = useRequireSession();
  const me = useMe(Boolean(user));

  return (
    <AppShell>
      <Head>
        <title>{t('page-title')}</title>
      </Head>
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t('title')}</h1>
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
