import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { WishView } from './wish-draft';

/** On = shown in this group (the default); off hides the wish from this group's members. */
export const HideWishSwitch = ({ groupSlug, wish }: { groupSlug: string; wish: WishView & { hidden: boolean } }) => {
  const t = useTranslations('wishlist.group');
  const id = useId();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewKey = trpc.wish.groupView.queryKey({ groupSlug });
  const setHidden = useMutation(
    trpc.wish.setHidden.mutationOptions({
      onMutate: ({ hidden }) =>
        queryClient.setQueryData(viewKey, (view) => view?.map((w) => (w.id === wish.id ? { ...w, hidden } : w))),
      onSettled: () => queryClient.invalidateQueries({ queryKey: viewKey }),
    })
  );

  return (
    <Field orientation="horizontal" className="w-fit">
      <Switch
        id={id}
        size="sm"
        aria-label={t('shown', { title: wish.title })}
        checked={!wish.hidden}
        onCheckedChange={(shown) => setHidden.mutate({ groupSlug, wishId: wish.id, hidden: !shown })}
      />
      <FieldLabel htmlFor={id}>{t('show')}</FieldLabel>
    </Field>
  );
};
