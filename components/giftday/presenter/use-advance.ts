import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGiftDayError } from '../use-gift-day-error';

type Action = 'start' | 'spin' | 'vote' | 'tally' | 'santa' | 'more' | 'last' | 'open' | 'steal' | 'keep' | 'back';

/** The presenter's steps, stored on the server; the answer is the new presenter view. */
export const useAdvance = (groupSlug: string, editionNumber: number) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onError = useGiftDayError();
  const presenterKey = trpc.giftday.presenter.queryKey({ groupSlug, editionNumber });
  const mutation = useMutation(
    trpc.giftday.advance.mutationOptions({
      // The reel landed on whose turn the server already decided; `spin` only marks it shown. So show
      // the turn now instead of waiting for the round trip (an error refetches the real state).
      onMutate: async ({ action }) => {
        if (action !== 'spin') return;
        await queryClient.cancelQueries({ queryKey: presenterKey });
        queryClient.setQueryData(presenterKey, (view) =>
          view?.unwrapOrder ? { ...view, unwrapOrder: { ...view.unwrapOrder, currentShown: true } } : view
        );
      },
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
  const advance = (action: Action, turnsTaken: number, swap?: { giftNo?: number; label?: string }) => {
    if (!mutation.isPending) mutation.mutate({ groupSlug, editionNumber, action, turnsTaken, ...swap });
  };
  return { advance, isPending: mutation.isPending };
};
