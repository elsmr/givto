import { Button } from '@/components/ui/button';
import { withTooltip } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import type { WishView } from './wish-draft';

type GroupWish = WishView & { shown: boolean; alsoIn: { name: string }[] };

/** Hide a wish in this group, or show it at the end of the group's list. Showing a wish another active group shows asks first: two Santas might buy it. */
export const ShowWishButton = ({ groupSlug, wish }: { groupSlug: string; wish: GroupWish }) => {
  const t = useTranslations('wishlist.group');
  const format = useFormatter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
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
      onSettled: () => queryClient.invalidateQueries({ queryKey: viewKey }),
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
    <>
      <Button
        variant="neutral"
        size="sm"
        aria-label={t('show', { title: wish.title })}
        onClick={() => (wish.alsoIn.length > 0 ? setConfirming(true) : show(true))}
      >
        <Eye aria-hidden="true" />
        {t('show-short')}
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('duplicate-title', { groups: format.list(wish.alsoIn.map(({ name }) => name)) })}</DialogTitle>
            <DialogDescription>{t('duplicate-description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="neutral" />}>{t('duplicate-cancel')}</DialogClose>
            <Button
              onClick={() => {
                show(true);
                setConfirming(false);
              }}
            >
              {t('duplicate-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
