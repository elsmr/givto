import { SantaSection } from '@/components/between/santa-section';
import { RevealCard } from '@/components/draw/reveal-card';
import { useGifteeRevealed } from '@/components/draw/use-giftee-revealed';
import { GotGiftCard } from '@/components/gift/got-gift-card';
import { GifteeWishlist } from '@/components/wishlist/giftee-wishlist';
import type { GroupEdition } from './group-data';

/** The "My giftee" tab (61): tap to reveal, then "I've got my gift" (63), their wishlist with Dibs! and, next to it, tips, Psst! and questions. */
export const GifteePanel = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const input = { groupSlug, editionNumber: edition.number };
  const [revealed] = useGifteeRevealed(groupSlug, edition.number);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        <RevealCard {...input} timeZone={edition.timeZone} />
        {revealed && (
          <>
            <GotGiftCard {...input} />
            <GifteeWishlist {...input} />
          </>
        )}
      </div>
      {revealed && (
        <div className="min-w-0">
          <SantaSection input={input} />
        </div>
      )}
    </div>
  );
};
