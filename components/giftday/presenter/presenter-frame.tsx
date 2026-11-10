import { usePreferredLocale } from '@/components/shell/use-preferred-locale';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';

type PresenterFrameProps = { groupSlug: string; heading?: string; children: ReactNode };

/** Full-screen stage for a TV or laptop at the party: no site header or footer. */
export const PresenterFrame = ({ groupSlug, heading, children }: PresenterFrameProps) => {
  const t = useTranslations('giftday.present');
  usePreferredLocale();

  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h1 className="min-w-0 text-xl font-extrabold break-words sm:text-2xl">{heading ?? t('page-title')}</h1>
        <Link href={`/g/${groupSlug}`} className="inline-flex min-h-11 items-center gap-2 font-semibold">
          <ArrowLeft aria-hidden="true" className="size-5" />
          {t('back')}
        </Link>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
};
