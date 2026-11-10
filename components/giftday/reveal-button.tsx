import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useGiftDayError } from './use-gift-day-error';
import { useRefreshGiftDay } from './use-refresh-gift-day';

type RevealButtonProps = { groupSlug: string; editionNumber: number; className?: string };

/** Organizer, from gift day on with the reveal on: show everyone who was whose Santa. Neutral: on gift day the presenter view is the main action. */
export const RevealButton = ({ groupSlug, editionNumber, className }: RevealButtonProps) => {
  const t = useTranslations('giftday.reveal');
  const trpc = useTRPC();
  const refresh = useRefreshGiftDay();
  const onError = useGiftDayError();
  const reveal = useMutation(trpc.giftday.reveal.mutationOptions({ onSuccess: refresh, onError }));

  return (
    <Button size="lg" variant="neutral" className={className} disabled={reveal.isPending} onClick={() => reveal.mutate({ groupSlug, editionNumber })}>
      <Sparkles aria-hidden="true" />
      {t('button')}
    </Button>
  );
};
