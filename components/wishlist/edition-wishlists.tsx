import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { WishCard } from './wish-card';

/** A done edition's wishlists (100), read-only, as they were when it ended: mine first, then everyone else in it. */
export const EditionWishlists = ({ groupSlug, editionNumber }: { groupSlug: string; editionNumber: number }) => {
  const t = useTranslations('wishlist.edition');
  const trpc = useTRPC();
  const view = useQuery(trpc.wish.editionLists.queryOptions({ groupSlug, editionNumber }));

  if (view.isPending) return <Skeleton className="h-40" />;
  if (!view.data || !view.data.saved) {
    return (
      <Card>
        <CardContent>
          <p>{t(view.data ? 'not-saved' : 'not-in')}</p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted">{t('intro')}</p>
      {view.data.lists.map(({ memberId, name, mine, wishes }) => (
        <Card key={memberId}>
          <CardHeader>
            <IconCardTitle icon={Heart} tone="coral">
              {mine ? t('mine') : t('title', { name })}
            </IconCardTitle>
            {wishes.length === 0 && <CardDescription>{t('empty')}</CardDescription>}
          </CardHeader>
          {wishes.length > 0 && (
            <CardContent>
              <ul className="flex flex-col divide-y-2 divide-dashed divide-outline">
                {wishes.map((wish) => (
                  <li key={wish.id} className="py-3 first:pt-0 last:pb-0">
                    <WishCard wish={wish} className="bg-transparent shadow-none data-[size=sm]:border-0 data-[size=sm]:[--card-spacing:0]" />
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
};
