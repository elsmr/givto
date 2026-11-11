import { Button } from '@/components/ui/button';
import { withTooltip } from '@/components/ui/tooltip';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EyeOff, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WishView } from './wish-draft';

type GroupWish = WishView & { shown: boolean; rank: number; alsoIn: { name: string }[] };

/** Hide a wish in this group, or show it at the end of the group's list. A wish another active group shows too says so on its card. */
export const ShowWishButton = ({ groupSlug, wish }: { groupSlug: string; wish: GroupWish }) => {
  const t = useTranslations('wishlist.group');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewKey = trpc.wish.groupView.queryKey({ groupSlug });
  const setShown = useMutation(
    trpc.wish.setShown.mutationOptions({
      onMutate: async ({ shown }) => {
        await queryClient.cancelQueries({ queryKey: viewKey });
        // As groupView orders them: shown in the group's order (a newly shown one last), hidden in the global order.
        queryClient.setQueryData(viewKey, (view) => {
          if (!view) return view;
          const next = [...view.filter((w) => w.id !== wish.id), { ...wish, shown }];
          return [...next.filter((w) => w.shown), ...next.filter((w) => !w.shown).toSorted((a, b) => a.rank - b.rank)];
        });
      },
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: viewKey }),
          queryClient.invalidateQueries({ queryKey: trpc.account.groups.queryKey() }),
        ]),
    })
  );
  const show = (shown: boolean) => setShown.mutate({ groupSlug, wishId: wish.id, shown });

  if (wish.shown) {
    return withTooltip(
      t('hide', { title: wish.title }),
      <Button variant="neutral" size="icon-sm" onClick={() => show(false)}>
        <EyeOff aria-hidden="true" />
      </Button>
    );
  }
  return (
    <Button variant="neutral" size="sm" className="max-w-full" aria-label={t('show', { title: wish.title })} onClick={() => show(true)}>
      <Plus aria-hidden="true" />
      <span className="truncate">{wish.title}</span>
    </Button>
  );
};
