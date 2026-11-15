import { PrivacyProcessors } from '@/components/privacy/privacy-processors';
import { PrivacyRetention } from '@/components/privacy/privacy-retention';
import { PrivacyRights } from '@/components/privacy/privacy-rights';
import { PrivacyStored } from '@/components/privacy/privacy-stored';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { privacyUpdatedOn } from '@/lib/privacy';
import { requireEnv } from '@/lib/server/env';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useFormatter, useTranslations } from 'next-intl';

export interface OwnerContact {
  name: string;
  email: string;
}

/** Whoever runs this instance is the controller. Read at build time: a missing value fails the build. */
export const ownerContact = (): OwnerContact => ({ name: requireEnv('OWNER_NAME'), email: requireEnv('OWNER_EMAIL') });

export default function PrivacyPage({ owner }: { owner: OwnerContact }) {
  const t = useTranslations('privacy');
  const format = useFormatter();

  return (
    <AppShell>
      <article className="mx-auto flex max-w-3xl flex-col gap-8 text-lg">
        <PageHeader
          eyebrow={t('updated', { date: format.dateTime(new Date(privacyUpdatedOn), { dateStyle: 'long' }) })}
          title={t('title')}
          description={t('intro')}
        />
        <PrivacyStored />
        <PrivacyRetention />
        <PrivacyProcessors />
        <PrivacyRights owner={owner} />
      </article>
    </AppShell>
  );
}

// The Dutch twin is pages/nl/: only indexable pages have the language in the URL (81).
export const getStaticProps: GetStaticProps = async () => ({
  props: { locale: 'en', messages: await loadMessages('en', ['privacy', 'seo']), owner: ownerContact() },
});
