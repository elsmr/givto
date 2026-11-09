import { CreateFlow } from '@/components/create/create-flow';
import { AppShell } from '@/components/shell/app-shell';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import Head from 'next/head';

export default function NewSecretSantaPage() {
  const t = useTranslations('create');
  return (
    <AppShell>
      <Head>
        <title>{`${t('page-title')} · Givto`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <CreateFlow />
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['create', 'join', 'group']) },
});
