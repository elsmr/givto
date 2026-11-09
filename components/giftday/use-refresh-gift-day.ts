import { useTRPC } from '@/lib/client/trpc';
import { useQueryClient } from '@tanstack/react-query';

/** After a gift day change: the home's gift day sections and the presenter view. */
export const useRefreshGiftDay = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries(trpc.giftday.get.pathFilter()),
      queryClient.invalidateQueries(trpc.giftday.presenter.pathFilter()),
    ]);
};
