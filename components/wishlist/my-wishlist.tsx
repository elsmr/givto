import { LoadFailed } from '@/components/shell/load-failed';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { EyeOff, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AddWish } from './add-wish';
import { ArchivedWishes } from './archived-wishes';
import { useOwnWishes } from './use-own-wishes';
import { useWishMutations } from './use-wish-mutations';
import { WishGroupChips, WishGroupsPicker } from './wish-groups';
import { WishListEditor } from './wish-list-editor';

/** The "My wishlist" page body (38): add or import a wish, pick the groups that see it, edit, reorder, archive (76). */
export const MyWishlist = () => {
  const t = useTranslations('wishlist');
  const wishes = useOwnWishes();
  const groups = useQuery(useTRPC().account.groups.queryOptions());
  const { move, setShown } = useWishMutations();
  const shownIn = (wishId: string) => (groups.data ?? []).filter((group) => group.shownWishIds.includes(wishId)).map(({ slug }) => slug);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('page-title')} description={t('intro')}>
        {wishes.data && <Badge variant="yellow">{t('count', { count: wishes.data.length })}</Badge>}
      </PageHeader>
      {/* Keyed: the list comes in as new content, not as the skeleton's element moved down by the count. */}
      {wishes.isPending || wishes.signedOut ? (
        <div key="loading" data-page-loading aria-busy="true" aria-label={t('loading')} className="flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
        </div>
      ) : wishes.isError ? (
        <LoadFailed message={t('errors.generic')} onRetry={() => void wishes.refetch()} />
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <AddWish empty={wishes.data.length === 0} />
          {wishes.data.length > 0 && (
            <section aria-labelledby="wishes-title" className="flex flex-col gap-4">
              <h2 id="wishes-title" className="sr-only">
                {t('list-title')}
              </h2>
              <WishListEditor
                wishes={wishes.data}
                onMove={(wishId, toIndex) => move.mutate({ wishId, toIndex })}
                status={(wish) => <WishGroupChips shownIn={shownIn(wish.id)} flagNone />}
                actions={(wish) => (
                  <WishGroupsPicker
                    wishTitle={wish.title}
                    shownIn={shownIn(wish.id)}
                    onChange={(groupSlug, shown) => setShown.mutate({ groupSlug, wishId: wish.id, shown })}
                  />
                )}
              />
              <p className="flex items-start gap-2 text-sm text-muted">
                <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  {t.rich('hide-hint', {
                    groups: () => <Users role="img" aria-label={t('form.groups')} className="inline size-4 align-text-bottom" />,
                  })}
                </span>
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
