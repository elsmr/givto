import { usePreferredLocale } from '@/components/shell/use-preferred-locale';
import { buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';

type PresenterFrameProps = { groupSlug: string; heading?: string; settings?: ReactNode; children: ReactNode };

/** Full-screen stage for a TV or laptop at the party: no site header or footer. */
export const PresenterFrame = ({ groupSlug, heading, settings, children }: PresenterFrameProps) => {
  const t = useTranslations('giftday.present');
  usePreferredLocale();

  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink">
      <header className="flex items-center justify-between gap-3 px-6 py-4">
        <h1 className="min-w-0 text-xl font-extrabold break-words sm:text-2xl">{heading ?? t('page-title')}</h1>
        <div className="flex shrink-0 gap-1">
          {settings}
          <Tooltip>
            <TooltipTrigger render={<Link href={`/g/${groupSlug}`} aria-label={t('close')} className={buttonVariants({ variant: 'ghost', size: 'icon' })} />}>
              <X aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent side="bottom">{t('close')}</TooltipContent>
          </Tooltip>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
};
