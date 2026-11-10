import { Doodle } from '@/components/group/doodle';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GroupVisibilityDialog } from './group-visibility-dialog';
import { WishCard } from './wish-card';

/** "My wishlist in this group" (61): what this group sees; the hidden ones folded away under it; editing on /wishlist, hiding in a dialog. */
export const GroupWishlist = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('wishlist.group');
  const trpc = useTRPC();
  const view = useQuery(trpc.wish.groupView.queryOptions({ groupSlug }));
  const wishes = view.data ?? [];
  const shown = wishes.filter((wish) => wish.shown);
  const hidden = wishes.filter((wish) => !wish.shown);

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
          <>
            {shown.length === 0 ? (
              <p>{t('all-hidden')}</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {shown.map((wish) => (
                  <li key={wish.id}>
                    <WishCard wish={wish} />
                  </li>
                ))}
              </ul>
            )}
            {hidden.length > 0 && (
              <details className="group/hidden border-2 border-dashed border-outline">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-semibold text-muted hover:bg-page [&::-webkit-details-marker]:hidden">
                  {t('hidden-summary', { count: hidden.length })}
                  <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open/hidden:rotate-180" />
                </summary>
                <ul className="flex flex-col gap-1 border-t-2 border-dashed border-outline px-3 py-2 text-muted">
                  {hidden.map((wish) => (
                    <li key={wish.id} className="break-words">
                      {wish.title}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
        <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
          <Link href={{ pathname: '/wishlist', query: { group: groupSlug } }} className={buttonVariants({ variant: wishes.length === 0 ? 'default' : 'neutral' })}>
            {t(wishes.length === 0 ? 'add' : 'edit')}
          </Link>
          {wishes.length > 0 && <GroupVisibilityDialog groupSlug={groupSlug} wishes={wishes} />}
        </div>
      </CardContent>
    </Card>
  );
};
