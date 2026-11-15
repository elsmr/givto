import type { GroupEdition } from '@/components/group/group-data';
import { BigRevealCard } from './big-reveal-card';
import { HowDidItGoCard } from './how-did-it-go-card';
import { SwapTableCard } from './swap-table';
import { useGiftDay } from './use-gift-day';

/**
 * After gift day on the overview (61): mark what I got (current edition only), and the big reveal or the Santas shown at
 * the turns; a White Elephant's table, as far as the swap got.
 */
export const AfterGiftDayMain = ({ groupSlug, edition, manage }: { groupSlug: string; edition: GroupEdition; manage: boolean }) => {
  const input = { groupSlug, editionNumber: edition.number };
  const giftDay = useGiftDay(input, edition.status);

  return (
    <>
      {edition.isCurrent && edition.kind !== 'whiteElephant' && <HowDidItGoCard groupSlug={groupSlug} />}
      {giftDay.data?.swap && giftDay.data.swap.gifts.length > 0 && <SwapTableCard swap={giftDay.data.swap} />}
      {giftDay.data && <BigRevealCard reveal={giftDay.data.reveal} guessing={giftDay.data.guessing} done />}
    </>
  );
};
