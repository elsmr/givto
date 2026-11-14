import { LoadFailed } from '@/components/shell/load-failed';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { moveItem } from '@/lib/move-item';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AddWish } from './add-wish';
import { ShowWishButton } from './show-wish-button';
import { AlsoInNote } from './wish-groups';
import { WishListEditor } from './wish-list-editor';

/** "My wishlist in this group" (61): add a new wish or pick one from your wishlist that this group doesn't show yet; what it sees in its own order, editable like /wishlist. */
export const GroupWishlist = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('wishlist.group');
  const tWishlist = useTranslations('wishlist');
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
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AddWish groupSlug={groupSlug} empty={view.isSuccess && wishes.length === 0} />
        {hidden.length > 0 && (
          <section aria-labelledby={`${groupSlug}-pick`} className="flex flex-col gap-2">
            <h3 id={`${groupSlug}-pick`} className="text-sm font-semibold text-muted">
              {t('pick')}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {hidden.map((wish) => (
                <li key={wish.id} className="min-w-0">
                  <ShowWishButton groupSlug={groupSlug} wish={wish} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {view.isPending ? (
          <Skeleton className="h-24" />
        ) : view.isError ? (
          <LoadFailed message={tWishlist('errors.INTERNAL')} onRetry={() => void view.refetch()} />
        ) : (
          shown.length > 0 && (
            <WishListEditor
              wishes={shown}
              onMove={(wishId, toIndex) => move.mutate({ groupSlug, wishId, toIndex })}
              status={(wish) => wish.alsoIn.length > 0 && <AlsoInNote groups={wish.alsoIn.map(({ name }) => name)} />}
              actions={(wish) => <ShowWishButton groupSlug={groupSlug} wish={wish} />}
            />
          )
        )}
      </CardContent>
    </Card>
  );
};
