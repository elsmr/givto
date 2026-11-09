import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGiftDayError } from '../use-gift-day-error';

type Action = 'start' | 'spin' | 'more' | 'last' | 'back';

/** The presenter's steps, stored on the server; the answer is the new presenter view. */
export const useAdvance = (groupSlug: string, editionNumber: number) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onError = useGiftDayError();
  const presenterKey = trpc.giftday.presenter.queryKey({ groupSlug, editionNumber });
  const mutation = useMutation(
    trpc.giftday.advance.mutationOptions({
      onSuccess: (view) => {
        queryClient.setQueryData(presenterKey, view);
        void queryClient.invalidateQueries(trpc.giftday.get.pathFilter());
      },
      onError: (error) => {
        onError(error);
        void queryClient.invalidateQueries({ queryKey: presenterKey });
      },
    })
  );
  const advance = (action: Action, turnsTaken: number) => {
    if (!mutation.isPending) mutation.mutate({ groupSlug, editionNumber, action, turnsTaken });
  };
  return { advance, isPending: mutation.isPending };
};
