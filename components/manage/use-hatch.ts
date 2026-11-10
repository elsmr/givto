import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import { useRefreshGiftDay } from '@/components/giftday/use-refresh-gift-day';
import { toast } from '@/components/ui/toast';
import { useTRPCClient } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { Hatch } from './hatches';

type HatchInput = { editionNumber: number; giftDayDate: string };

/** Runs one hatch, then refreshes the group page and its gift day sections and says it's done. */
export const useHatch = (hatch: Hatch, groupSlug: string, onDone: () => void) => {
  const t = useTranslations('manage');
  const client = useTRPCClient();
  const refresh = useRefreshEdition(groupSlug);
  const refreshGiftDay = useRefreshGiftDay();
  return useMutation({
    mutationFn: ({ editionNumber, giftDayDate }: HatchInput) =>
      hatch === 'backToShopping'
        ? client.manage.backToShopping.mutate({ groupSlug, editionNumber, giftDayDate })
        : client.manage[hatch].mutate({ groupSlug, editionNumber }),
    onSuccess: async () => {
      await Promise.all([refresh(), refreshGiftDay()]);
      onDone();
      toast.add({ title: t(`${hatch}.done`), type: 'success' });
    },
  });
};
