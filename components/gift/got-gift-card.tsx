import { useGifteeRevealed } from '@/components/draw/use-giftee-revealed';
import { useErrorMessage } from '@/components/wishlist/use-error-message';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, PackageCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { GotGiftForm } from './got-gift-form';

/** "I've got my gift" on the giftee tab (63): what I got, private to me; stops the gift reminders. */
export const GotGiftCard = ({ groupSlug, editionNumber }: { groupSlug: string; editionNumber: number }) => {
  const t = useTranslations('wishlist.got-gift');
  const errorMessage = useErrorMessage();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const input = { groupSlug, editionNumber };
  const [revealed] = useGifteeRevealed(groupSlug, editionNumber);
  const [open, setOpen] = useState(false);
  const list = useQuery(trpc.claim.gifteeWishlist.queryOptions(input));
  const canMark = Boolean(list.data?.canClaim);
  const mine = useQuery({ ...trpc.gift.mine.queryOptions(input), enabled: canMark });
  const save = useMutation(
    trpc.gift.set.mutationOptions({
      onSuccess: ({ marked, wishIds, lines }) => {
        setOpen(false);
        toast.add({ title: marked ? t('saved', { count: wishIds.length + lines.length }) : t('cleared'), type: 'success' });
      },
      onError: (error) => toast.add({ title: errorMessage(error), type: 'error' }),
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries(trpc.gift.pathFilter()),
          queryClient.invalidateQueries(trpc.claim.gifteeWishlist.pathFilter()),
          queryClient.invalidateQueries(trpc.account.groups.pathFilter()),
        ]),
    })
  );

  if (!list.data || !revealed || !canMark || !mine.data) return null;
  const { giftee } = list.data;
  const count = mine.data.marked ? mine.data.wishIds.length + mine.data.lines.length : 0;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={PackageCheck} tone="mint">
          {t('title')}
        </IconCardTitle>
        <CardDescription>{t('private', { name: giftee.name })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {count > 0 ? (
          <Badge variant="mint">
            <Check aria-hidden="true" />
            {t('marked', { count })}
          </Badge>
        ) : (
          <p>{t('not-yet', { name: giftee.name })}</p>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant={count > 0 ? 'neutral' : 'default'} />}>
            {count > 0 ? t('change') : t('open')}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dialog-title')}</DialogTitle>
              <DialogDescription>{t('dialog-description', { name: giftee.name })}</DialogDescription>
            </DialogHeader>
            <GotGiftForm list={list.data} initial={mine.data} busy={save.isPending} onSubmit={(draft) => save.mutate({ ...input, ...draft })} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
