import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { buttonVariants } from '@/components/ui/button';
import { Presentation } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** Gift day itself: a celebration, and the presenter view for the organizer. */
export const GiftDayHero = ({ groupSlug, canPresent }: { groupSlug: string; canPresent: boolean }) => {
  const t = useTranslations('giftday.hero');

  return (
    <section className="flex flex-col items-center gap-4 bg-yellow p-6 text-center text-ink bordered shadow-brand sm:p-10">
      <LogoAnimation variant="celebrate" className="size-24 sm:size-28" />
      <h2 className="text-4xl font-extrabold sm:text-6xl">{t('title')}</h2>
      <p className="text-lg">{t('description')}</p>
      {canPresent && (
        <Link href={`/g/${groupSlug}/present`} className={buttonVariants({ size: 'lg' })}>
          <Presentation aria-hidden="true" />
          {t('present')}
        </Link>
      )}
    </section>
  );
};
