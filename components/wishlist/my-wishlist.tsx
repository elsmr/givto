import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from 'next-intl';
import { AddWish } from './add-wish';
import { useOwnWishes } from './use-own-wishes';
import { WishListEditor } from './wish-list-editor';

/** The "My wishlist" page body (38): add or import a wish, edit, reorder. */
export const MyWishlist = () => {
  const t = useTranslations('wishlist');
  const wishes = useOwnWishes();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t('page-title')}</h1>
        <p className="max-w-prose text-muted">{t('intro')}</p>
      </div>
      {wishes.isPending || wishes.signedOut ? (
        <div aria-busy="true" aria-label={t('loading')} className="flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-24" />
        </div>
      ) : wishes.isError ? (
        <Alert variant="danger">{t('errors.generic')}</Alert>
      ) : (
        <>
          <AddWish />
          {wishes.data.length === 0 ? (
            <p className="bg-surface p-4 bordered">{t('empty')}</p>
          ) : (
            <WishListEditor wishes={wishes.data} />
          )}
        </>
      )}
    </div>
  );
};
