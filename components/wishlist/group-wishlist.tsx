import { Doodle } from '@/components/group/doodle';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GroupVisibilityDialog } from './group-visibility-dialog';
import { WishSummary } from './wish-summary';

/** "My wishlist in this group" (61): what this group sees, hidden wishes marked; editing on /wishlist, hiding in a dialog. */
export const GroupWishlist = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('wishlist.group');
  const trpc = useTRPC();
  const view = useQuery(trpc.wish.groupView.queryOptions({ groupSlug }));
  const wishes = view.data ?? [];

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Heart} tone="coral">
          {t('title')}
        </IconCardTitle>
        <CardDescription>{t('intro')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {view.isPending ? (
          <Skeleton className="h-24" />
        ) : wishes.length === 0 ? (
          <div className="flex items-center gap-4">
            <Doodle shape="dots" className="text-primary-muted" />
            <p>{t('empty')}</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y-2 divide-dashed divide-ink/30">
            {wishes.map((wish) => (
              <li key={wish.id} className="flex flex-col gap-2 py-3">
                <div className={wish.hidden ? 'opacity-60' : undefined}>
                  <WishSummary wish={wish} />
                </div>
                {wish.hidden && <Badge>{t('hidden-badge')}</Badge>}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
          <Link href="/wishlist" className={buttonVariants({ variant: wishes.length === 0 ? 'default' : 'neutral' })}>
            {t(wishes.length === 0 ? 'add' : 'edit')}
          </Link>
          {wishes.length > 0 && <GroupVisibilityDialog groupSlug={groupSlug} wishes={wishes} />}
        </div>
      </CardContent>
    </Card>
  );
};
