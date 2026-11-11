import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useGifteeRevealed } from '@/components/draw/use-giftee-revealed';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { PackageCheck } from 'lucide-react';
import { ClaimButton } from './claim-button';
import { isInBudget } from './format-price';
import { WishCard } from './wish-card';
import { GifteeTips } from '@/components/between/giftee-tips';
import { SantaQuestions } from '@/components/between/santa-questions';

interface GifteeWishlistProps {
  groupSlug: string;
  editionNumber: number;
}

/** "Your giftee's wishlist" with Dibs!, then tips from others and your questions. Renders nothing before the draw or when you're not in it. */
export const GifteeWishlist = ({ groupSlug, editionNumber }: GifteeWishlistProps) => {
  const t = useTranslations('wishlist.giftee');
  const trpc = useTRPC();
  const list = useQuery(trpc.claim.gifteeWishlist.queryOptions({ groupSlug, editionNumber }));
  // What I marked as bought (63); the same query as the "I've got my gift" card.
  const gift = useQuery({ ...trpc.gift.mine.queryOptions({ groupSlug, editionNumber }), enabled: Boolean(list.data?.canClaim) });
  const bought = new Set(gift.data?.marked ? gift.data.wishIds : []);
  const [revealed] = useGifteeRevealed(groupSlug, editionNumber);

  if (list.isPending) return <Skeleton className="h-40" />;
  // Names the giftee: stays hidden until the reveal card is tapped.
  if (!list.data || !revealed) return null;
  const { giftee, budget, canClaim, wishes } = list.data;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Heart} tone="coral">
          {t('title', { name: giftee.name })}
        </IconCardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {wishes.length === 0 ? (
          <p>{t('empty', { name: giftee.name })}</p>
        ) : (
          <ul className="flex flex-col divide-y-2 divide-dashed divide-outline">
            {wishes.map((wish) => (
              <li key={wish.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <WishCard
                  wish={wish}
                  className="min-w-0 flex-1 bg-transparent shadow-none data-[size=sm]:border-0 data-[size=sm]:[--card-spacing:0]"
                  inBudget={isInBudget(wish.price, budget)}
                  status={
                    (wish.archived || bought.has(wish.id)) && (
                      <>
                        {wish.archived && <Badge>{t('gone')}</Badge>}
                        {bought.has(wish.id) && (
                          <Badge variant="mint">
                            <PackageCheck aria-hidden="true" />
                            {t('bought')}
                          </Badge>
                        )}
                      </>
                    )
                  }
                />
                <div className="flex max-w-[45%] shrink-0 justify-end text-right">
                  <ClaimButton input={{ groupSlug, editionNumber, wishId: wish.id }} title={wish.title} claim={wish.claim} canClaim={canClaim} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <GifteeTips input={{ groupSlug, editionNumber }} />
        <SantaQuestions input={{ groupSlug, editionNumber }} />
      </CardContent>
    </Card>
  );
};
