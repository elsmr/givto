import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useGiftDayError } from './use-gift-day-error';
import { useRefreshGiftDay } from './use-refresh-gift-day';

type ShuffleButtonProps = { groupSlug: string; editionNumber: number; again: boolean; className?: string };

/** Organizer: shuffle the unwrap order, or shuffle it again. */
export const ShuffleButton = ({ groupSlug, editionNumber, again, className }: ShuffleButtonProps) => {
  const t = useTranslations('giftday.order');
  const trpc = useTRPC();
  const refresh = useRefreshGiftDay();
  const onError = useGiftDayError();
  const shuffle = useMutation(
    trpc.giftday.shuffle.mutationOptions({
      onSuccess: async () => {
        await refresh();
        toast.add({ title: t('shuffled'), type: 'success' });
      },
      onError,
    })
  );

  return (
    <Button
      variant={again ? 'neutral' : 'default'}
      className={className}
      disabled={shuffle.isPending}
      onClick={() => shuffle.mutate({ groupSlug, editionNumber })}
    >
      <Shuffle aria-hidden="true" />
      {again ? t('reshuffle') : t('shuffle')}
    </Button>
  );
};
