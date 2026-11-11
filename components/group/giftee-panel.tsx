import { PsstButton } from '@/components/between/psst-button';
import { AskQuestionButton } from '@/components/between/santa-questions';
import { RevealCard } from '@/components/draw/reveal-card';
import { useGifteeRevealed } from '@/components/draw/use-giftee-revealed';
import { GotGiftAction } from '@/components/gift/got-gift-action';
import { GifteeWishlist } from '@/components/wishlist/giftee-wishlist';
import { GifteeAddressCard } from './address-card';
import type { GroupEdition } from './group-data';

/**
 * The "My giftee" tab (61): tap to reveal, with what you can do next to the name ("I've got my gift" (63), Psst!,
 * ask a question); where to post it (80); their wishlist with Dibs!, tips from others and your questions.
 */
export const GifteePanel = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const input = { groupSlug, editionNumber: edition.number };
  const [revealed] = useGifteeRevealed(groupSlug, edition.number);

  return (
    <div className="flex flex-col gap-6">
      <RevealCard {...input} timeZone={edition.timeZone}>
        {revealed && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <GotGiftAction {...input} />
            <PsstButton input={input} />
            <AskQuestionButton input={input} />
          </div>
        )}
      </RevealCard>
      {revealed && edition.exchangeMode !== 'inPerson' && <GifteeAddressCard {...input} />}
      {revealed && <GifteeWishlist {...input} />}
    </div>
  );
};
