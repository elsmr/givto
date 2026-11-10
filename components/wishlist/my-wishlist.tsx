import { LoadFailed } from '@/components/shell/load-failed';
import { Badge } from '@/components/ui/badge';
import { IconTile } from '@/components/ui/icon-tile';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EyeOff, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AddWish } from './add-wish';
import { ArchivedWishes } from './archived-wishes';
import { useOwnWishes } from './use-own-wishes';
import { WishListEditor } from './wish-list-editor';

/** The "My wishlist" page body (38): add or import a wish, edit, reorder, archive (76). */
export const MyWishlist = () => {
  const t = useTranslations('wishlist');
  const wishes = useOwnWishes();

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
        // Phones: the empty note or "Add a wish" first, then the list. Wide: "Add a wish" beside it.
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          {wishes.data.length === 0 && (
            <div className="flex items-center gap-4 border-2 border-dashed border-outline bg-surface p-6 lg:col-start-1 lg:row-start-1">
              <IconTile icon={Heart} tone="coral" />
              <h2 className="text-xl font-bold">{t('empty-title')}</h2>
            </div>
          )}
          <div className="lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1">
            <AddWish />
          </div>
          {wishes.data.length > 0 && (
            <section aria-labelledby="wishes-title" className="flex flex-col gap-4">
              <h2 id="wishes-title" className="sr-only">
                {t('list-title')}
              </h2>
              <WishListEditor wishes={wishes.data} />
              <p className="flex items-start gap-2 text-sm text-muted">
                <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {t('hide-hint')}
              </p>
            </section>
          )}
          <ArchivedWishes />
        </div>
      )}
    </div>
  );
};
