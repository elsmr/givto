import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useGiftDayError } from './use-gift-day-error';
import { useRefreshGiftDay } from './use-refresh-gift-day';

type ShuffleButtonProps = { groupSlug: string; editionNumber: number; again: boolean };

/** Organizer: shuffle the unwrap order; shuffling again starts the unwrapping over, so it asks first. */
export const ShuffleButton = ({ groupSlug, editionNumber, again }: ShuffleButtonProps) => {
  const t = useTranslations('giftday.order');
  const trpc = useTRPC();
  const refresh = useRefreshGiftDay();
  const onError = useGiftDayError();
  const [confirming, setConfirming] = useState(false);
  const shuffle = useMutation(
    trpc.giftday.shuffle.mutationOptions({
      onSuccess: async () => {
        await refresh();
        setConfirming(false);
        toast.add({ title: t('shuffled'), type: 'success' });
      },
      onError,
    })
  );
  const run = () => shuffle.mutate({ groupSlug, editionNumber });
  const label = (
    <>
      <Shuffle aria-hidden="true" />
      {again ? t('reshuffle') : t('shuffle')}
    </>
  );

  if (!again) {
    return (
      <Button variant="neutral" disabled={shuffle.isPending} onClick={run}>
        {label}
      </Button>
    );
  }
  return (
    <Dialog open={confirming} onOpenChange={setConfirming}>
      <DialogTrigger render={<Button variant="neutral" />}>{label}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reshuffle-title')}</DialogTitle>
          <DialogDescription>{t('reshuffle-description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('cancel')}</DialogClose>
          <Button disabled={shuffle.isPending} onClick={run}>
            {t('reshuffle-confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
