import type { GroupEdition } from '@/components/group/group-data';
import { BigRevealCard } from './big-reveal-card';
import { HowDidItGoCard } from './how-did-it-go-card';
import { useGiftDay } from './use-gift-day';

/** After gift day on the overview (61): mark what I got (current edition only), and the big reveal when it's on. */
export const AfterGiftDayMain = ({ groupSlug, edition, manage }: { groupSlug: string; edition: GroupEdition; manage: boolean }) => {
  const input = { groupSlug, editionNumber: edition.number };
  const giftDay = useGiftDay(input, edition.status);

  return (
    <>
      {edition.isCurrent && <HowDidItGoCard groupSlug={groupSlug} />}
      {giftDay.data && <BigRevealCard {...input} reveal={giftDay.data.reveal} guessing={giftDay.data.guessing} status={edition.status} manage={manage} />}
    </>
  );
};
