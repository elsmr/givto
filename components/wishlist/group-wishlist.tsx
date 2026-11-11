import { Doodle } from '@/components/group/doodle';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { moveItem } from '@/lib/move-item';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AddWish } from './add-wish';
import { ShowWishButton } from './show-wish-button';
import { AlsoInNote } from './wish-groups';
import { WishListEditor } from './wish-list-editor';

/** "My wishlist in this group" (61): add a wish for this group, what it sees in its own order, editable like /wishlist; the hidden ones folded away under it. */
export const GroupWishlist = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('wishlist.group');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewKey = trpc.wish.groupView.queryKey({ groupSlug });
  const view = useQuery(trpc.wish.groupView.queryOptions({ groupSlug }));
  const move = useMutation(
    trpc.wish.moveInGroup.mutationOptions({
      onMutate: async ({ wishId, toIndex }) => {
        await queryClient.cancelQueries({ queryKey: viewKey });
        const previous = queryClient.getQueryData(viewKey);
        queryClient.setQueryData(viewKey, (list) => list && moveItem(list, wishId, toIndex));
        return { previous };
      },
      onError: (_error, _input, context) => queryClient.setQueryData(viewKey, context?.previous),
      onSettled: () => queryClient.invalidateQueries({ queryKey: viewKey }),
    })
  );
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
        <AddWish groupSlug={groupSlug} />
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
              <WishListEditor
                wishes={shown}
                onMove={(wishId, toIndex) => move.mutate({ groupSlug, wishId, toIndex })}
                status={(wish) => wish.alsoIn.length > 0 && <AlsoInNote groups={wish.alsoIn.map(({ name }) => name)} />}
                actions={(wish) => <ShowWishButton groupSlug={groupSlug} wish={wish} />}
              />
            )}
            {hidden.length > 0 && (
              <details className="group/hidden border-2 border-dashed border-outline">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-semibold text-muted hover:bg-page [&::-webkit-details-marker]:hidden">
                  {t('hidden-summary', { count: hidden.length })}
                  <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open/hidden:rotate-180" />
                </summary>
                <ul className="flex flex-col divide-y-2 divide-dashed divide-outline border-t-2 border-dashed border-outline px-3">
                  {hidden.map((wish) => (
                    <li key={wish.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 break-words text-muted">{wish.title}</span>
                      <ShowWishButton groupSlug={groupSlug} wish={wish} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
