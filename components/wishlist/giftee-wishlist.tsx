import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useGifteeRevealed } from '@/components/draw/use-giftee-revealed';
import { useTranslations } from 'next-intl';
import { ClaimButton } from './claim-button';
import { isInBudget } from './format-price';
import { WishSummary } from './wish-summary';

interface GifteeWishlistProps {
  groupSlug: string;
  editionNumber: number;
}

/** "Your giftee's wishlist" with Dibs!. Renders nothing before the draw or when you're not in it. */
export const GifteeWishlist = ({ groupSlug, editionNumber }: GifteeWishlistProps) => {
  const t = useTranslations('wishlist.giftee');
  const trpc = useTRPC();
  const list = useQuery(trpc.claim.gifteeWishlist.queryOptions({ groupSlug, editionNumber }));
  const [revealed] = useGifteeRevealed(groupSlug, editionNumber);

  if (list.isPending) return <Skeleton className="h-40" />;
  // Names the giftee: stays hidden until the reveal card is tapped.
  if (!list.data || !revealed) return null;
  const { giftee, budget, canClaim, wishes } = list.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title', { name: giftee.name })}</h2>
        </CardTitle>
        <CardDescription>{t('intro', { name: giftee.name })}</CardDescription>
      </CardHeader>
      <CardContent>
        {wishes.length === 0 ? (
          <p>{t('empty', { name: giftee.name })}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {wishes.map((wish) => (
              <li key={wish.id} className="flex flex-col gap-3 border-b-2 border-ink pb-3 last:border-b-0">
                <WishSummary wish={wish} inBudget={isInBudget(wish.price, budget)} />
                <ClaimButton
                  input={{ groupSlug, editionNumber, wishId: wish.id }}
                  title={wish.title}
                  claim={wish.claim}
                  canClaim={canClaim}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
