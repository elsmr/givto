import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import type { WishView } from './wish-draft';

type ShownWish = WishView & { shown: boolean; alsoIn: { name: string }[] };

/** On = shown in this group. Switching on a wish another active group shows asks first: two Santas might buy it. */
export const ShowWishSwitch = ({ groupSlug, wish }: { groupSlug: string; wish: ShownWish }) => {
  const t = useTranslations('wishlist.group');
  const format = useFormatter();
  const id = useId();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const viewKey = trpc.wish.groupView.queryKey({ groupSlug });
  const setShown = useMutation(
    trpc.wish.setShown.mutationOptions({
      onMutate: ({ shown }) =>
        queryClient.setQueryData(viewKey, (view) => view?.map((w) => (w.id === wish.id ? { ...w, shown } : w))),
      onSettled: () => queryClient.invalidateQueries({ queryKey: viewKey }),
    })
  );
  const show = (shown: boolean) => setShown.mutate({ groupSlug, wishId: wish.id, shown });

  return (
    <>
      <Field orientation="horizontal" className="w-fit">
        <Switch
          id={id}
          size="sm"
          aria-label={t('shown', { title: wish.title })}
          checked={wish.shown}
          onCheckedChange={(shown) => (shown && wish.alsoIn.length > 0 ? setConfirming(true) : show(shown))}
        />
        <FieldLabel htmlFor={id}>{t('show')}</FieldLabel>
      </Field>
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
