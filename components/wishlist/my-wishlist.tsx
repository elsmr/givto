import { LoadFailed } from '@/components/shell/load-failed';
import { Badge } from '@/components/ui/badge';
import { IconTile } from '@/components/ui/icon-tile';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { EyeOff, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AddWish } from './add-wish';
import { ArchivedWishes } from './archived-wishes';
import { useOwnWishes } from './use-own-wishes';
import { useWishMutations } from './use-wish-mutations';
import { WishGroups } from './wish-groups';
import { WishListEditor } from './wish-list-editor';

/** The "My wishlist" page body (38): add or import a wish, pick the groups that see it, edit, reorder, archive (76). */
export const MyWishlist = () => {
  const t = useTranslations('wishlist');
  const wishes = useOwnWishes();
  const groups = useQuery(useTRPC().account.groups.queryOptions());
  const { move, setShown } = useWishMutations();

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('page-title')} description={t('intro')}>
        {wishes.data && <Badge variant="yellow">{t('count', { count: wishes.data.length })}</Badge>}
      </PageHeader>
      {wishes.isPending || wishes.signedOut ? (
        <div aria-busy="true" aria-label={t('loading')} className="flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
        </div>
      ) : wishes.isError ? (
        <LoadFailed message={t('errors.generic')} onRetry={() => void wishes.refetch()} />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <AddWish />
          {wishes.data.length === 0 && (
            <div className="flex items-center gap-4 border-2 border-dashed border-outline bg-surface p-6">
              <IconTile icon={Heart} tone="coral" />
              <h2 className="text-xl font-bold">{t('empty-title')}</h2>
            </div>
          )}
          {wishes.data.length > 0 && (
            <section aria-labelledby="wishes-title" className="flex flex-col gap-4">
              <h2 id="wishes-title" className="sr-only">
                {t('list-title')}
              </h2>
              <WishListEditor
                wishes={wishes.data}
                onMove={(wishId, toIndex) => move.mutate({ wishId, toIndex })}
                status={(wish) => (
                  <WishGroups
                    wishTitle={wish.title}
                    shownIn={(groups.data ?? []).filter((group) => group.shownWishIds.includes(wish.id)).map(({ slug }) => slug)}
                    onChange={(groupSlug, shown) => setShown.mutate({ groupSlug, wishId: wish.id, shown })}
                  />
                )}
              />
              <p className="flex items-start gap-2 text-sm text-muted">
                <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {t('hide-hint')}
              </p>
            </section>
          )}
          </div>
          <ArchivedWishes />
        </div>
      )}
    </div>
  );
};
