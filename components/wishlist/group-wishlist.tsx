import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { HideWishSwitch } from './hide-wish-switch';
import { WishSummary } from './wish-summary';

/** "My wishlist in this group": every wish, with a switch to hide it from this group only. */
export const GroupWishlist = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('wishlist.group');
  const trpc = useTRPC();
  const view = useQuery(trpc.wish.groupView.queryOptions({ groupSlug }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription>{t('intro')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {view.isPending ? (
          <Skeleton className="h-24" />
        ) : !view.data || view.data.length === 0 ? (
          <p>{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {view.data.map((wish) => (
              <li key={wish.id} className="flex flex-col gap-2 border-b-2 border-ink pb-3 last:border-b-0">
                <div className={wish.hidden ? 'opacity-60' : undefined}>
                  <WishSummary wish={wish} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <HideWishSwitch groupSlug={groupSlug} wish={wish} />
                  {wish.hidden && <Badge>{t('hidden-badge')}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button variant="neutral" className="w-fit" nativeButton={false} render={<Link href="/wishlist" />}>
          {t('edit')}
        </Button>
      </CardContent>
    </Card>
  );
};
