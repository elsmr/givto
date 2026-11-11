import { GifteeLine } from '@/components/draw/giftee-line';
import { GiftsToOpen } from '@/components/gift/gifts-to-open';
import type { GroupEdition } from '@/components/group/group-data';
import { buttonVariants } from '@/components/ui/button';
import { MonitorPlay, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BigRevealCard } from './big-reveal-card';
import { GiftDayHero } from './gift-day-hero';
import { useGiftDay } from './use-gift-day';

/** Gift day on the overview (61): once the presenter started, the way to follow it on your phone (95), the call to join by post (87), the presenter for the organizer, the big reveal once it's out, one line about my giftee. */
export const GiftDayMain = ({ groupSlug, edition, manage }: { groupSlug: string; edition: GroupEdition; manage: boolean }) => {
  const t = useTranslations('giftday.hero');
  const input = { groupSlug, editionNumber: edition.number };
  const callUrl = edition.giftDay?.callUrl;
  const giftDay = useGiftDay(input, edition.status);

  return (
    <>
      <GiftDayHero groupSlug={groupSlug} canPresent={manage}>
        {giftDay.data?.unwrapOrder?.started && (
          <Link href={`/g/${groupSlug}/live`} className={buttonVariants({ size: 'lg' })}>
            <MonitorPlay aria-hidden="true" />
            {t('join-live')}
          </Link>
        )}
        {callUrl && (
          <a href={callUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className={buttonVariants({ size: 'lg', variant: 'neutral' })}>
            <Video aria-hidden="true" />
            {t('join-call')}
          </a>
        )}
        <GiftsToOpen {...input} />
        <GifteeLine {...input} />
      </GiftDayHero>
      {giftDay.data && <BigRevealCard reveal={giftDay.data.reveal} guessing={giftDay.data.guessing} />}
    </>
  );
};
