import { useTRPC } from '@/lib/client/trpc';
import { useQueryClient } from '@tanstack/react-query';

/** After a draw change: the group home, my giftee and my giftee's wishlist. */
export const useRefreshEdition = (groupSlug: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.group.get.queryKey({ groupSlug }) }),
      queryClient.invalidateQueries(trpc.draw.mine.pathFilter()),
      queryClient.invalidateQueries(trpc.claim.gifteeWishlist.pathFilter()),
    ]);
};
