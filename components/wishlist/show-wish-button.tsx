import { Button } from '@/components/ui/button';
import { withTooltip } from '@/components/ui/tooltip';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WishView } from './wish-draft';

type GroupWish = WishView & { shown: boolean; alsoIn: { name: string }[] };

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
        queryClient.setQueryData(viewKey, (view) => {
          if (!view) return view;
          const rest = view.filter((w) => w.id !== wish.id);
          const count = rest.filter((w) => w.shown).length;
          return [...rest.slice(0, count), { ...wish, shown }, ...rest.slice(count)];
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
    <Button variant="neutral" size="sm" aria-label={t('show', { title: wish.title })} onClick={() => show(true)}>
      <Eye aria-hidden="true" />
      {t('show-short')}
    </Button>
  );
};
