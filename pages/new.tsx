import { CreateFlow } from '@/components/create/create-flow';
import { AppShell } from '@/components/shell/app-shell';
import { useCurrentUser } from '@/lib/client/session';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';

export default function NewSecretSantaPage() {
  const t = useTranslations('create');
  // Starting a group doesn't need an account; signed-out visitors get the public header.
  const user = useCurrentUser();
  return (
    <AppShell app={Boolean(user)}>
      <Head>
        <title>{`${t('page-title')} · Givto`}</title>
      </Head>
      <CreateFlow />
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async () => ({
  props: { messages: await loadMessages('en', ['create', 'join', 'group']) },
});
