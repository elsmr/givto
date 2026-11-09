import { PrivacyProcessors } from '@/components/privacy/privacy-processors';
import { PrivacyRetention } from '@/components/privacy/privacy-retention';
import { PrivacyRights } from '@/components/privacy/privacy-rights';
import { PrivacyStored } from '@/components/privacy/privacy-stored';
import { AppShell } from '@/components/shell/app-shell';
import { privacyUpdatedOn } from '@/lib/privacy';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useFormatter, useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('privacy');
  const format = useFormatter();

  return (
    <AppShell>
      <article className="mx-auto flex max-w-3xl flex-col gap-12 text-lg">
        <header className="flex flex-col gap-4">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{t('title')}</h1>
          <p className="text-base text-muted">
            {t('updated', {
              date: format.dateTime(new Date(privacyUpdatedOn), {
                dateStyle: 'long',
              }),
            })}
          </p>
          <p>{t('intro')}</p>
        </header>
        <PrivacyStored />
        <PrivacyRetention />
        <PrivacyProcessors />
        <PrivacyRights />
      </article>
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: { messages: await loadMessages(locale, ['privacy', 'seo']) },
});
