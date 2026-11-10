import { GifteeLine } from '@/components/draw/giftee-line';
import { GiftsToOpen } from '@/components/gift/gifts-to-open';
import type { GroupEdition } from '@/components/group/group-data';
import { BigRevealCard } from './big-reveal-card';
import { GiftDayHero } from './gift-day-hero';
import { UnwrapNow } from './unwrap-now';
import { useGiftDay } from './use-gift-day';

/** Gift day on the overview (61): who's unwrapping now, the presenter for the organizer, the big reveal once it's out, one line about my giftee. */
export const GiftDayMain = ({ groupSlug, edition, manage }: { groupSlug: string; edition: GroupEdition; manage: boolean }) => {
  const input = { groupSlug, editionNumber: edition.number };
  const giftDay = useGiftDay(input, edition.status);
  const order = giftDay.data?.unwrapOrder;

  return (
    <>
      <GiftDayHero groupSlug={groupSlug} canPresent={manage}>
        {order?.started && <UnwrapNow order={order} guessing={giftDay.data?.guessing} className="w-full bg-surface text-left" />}
        <GiftsToOpen {...input} />
        <GifteeLine {...input} />
      </GiftDayHero>
      {giftDay.data && <BigRevealCard reveal={giftDay.data.reveal} guessing={giftDay.data.guessing} />}
    </>
  );
};
