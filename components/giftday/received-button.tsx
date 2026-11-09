import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useTRPC, useTRPCClient } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useGiftDayError } from './use-gift-day-error';

/** "I got this": the wish leaves my lists (owner only), with an undo in the toast. */
export const ReceivedButton = ({ wishId, title }: { wishId: string; title: string }) => {
  const t = useTranslations('giftday.after');
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const onError = useGiftDayError();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.wish.groupView.pathFilter()),
      queryClient.invalidateQueries(trpc.wish.list.pathFilter()),
    ]);
  // The row is gone by the time someone clicks undo, so undo calls the client directly.
  const undo = () => client.giftday.markReceived.mutate({ wishId, received: false }).then(refresh, onError);
  const mark = useMutation(
    trpc.giftday.markReceived.mutationOptions({
      onSuccess: async () => {
        await refresh();
        toast.add({ title: t('marked', { title }), type: 'success', actionProps: { children: t('undo'), onClick: undo } });
      },
      onError,
    })
  );

  return (
    <Button
      size="sm"
      variant="neutral"
      aria-label={t('got-it-label', { title })}
      disabled={mark.isPending}
      onClick={() => mark.mutate({ wishId, received: true })}
    >
      <Check aria-hidden="true" />
      {t('got-it')}
    </Button>
  );
};
