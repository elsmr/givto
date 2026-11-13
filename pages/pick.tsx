import { NamePicker } from '@/components/pick/name-picker';
import { localePath } from '@/components/shell/public-pages';
import { AppShell } from '@/components/shell/app-shell';
import { buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { loadMessages } from '@/messages/load';
import type { GetStaticProps } from 'next';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

// Static per language and indexable (37): picking happens on the device, nothing reaches the server.
export default function PickPage() {
  const t = useTranslations('pick');
  const locale = useLocale();

  return (
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <PageHeader title={t('title')} description={t('description')} />
        <NamePicker />
        <section aria-labelledby="givto-title" className="flex flex-col items-start gap-4 bg-primary-muted p-6 bordered">
          <h2 id="givto-title" className="text-xl font-extrabold">
            {t('givto.title')}
          </h2>
          <p>{t('givto.text')}</p>
          <Link href={localePath('/', locale)} className={buttonVariants({ variant: 'neutral' })}>
            {t('givto.cta')}
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

// The Dutch twin is pages/nl/: only indexable pages have the language in the URL (81).
export const getStaticProps: GetStaticProps = async () => ({
  props: { locale: 'en', messages: await loadMessages('en', ['pick', 'seo']) },
});
