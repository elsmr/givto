import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moveItem } from '@/lib/move-item';

/** Create, update, archive, restore, delete and move the signed-in person's wishes; moves are optimistic. */
export const useWishMutations = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listKey = trpc.wish.list.queryKey();
  // Also refreshes the per-group views (wish.groupView).
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.wish.pathKey() });

  const create = useMutation(trpc.wish.create.mutationOptions({ onSuccess: refresh }));
  const update = useMutation(trpc.wish.update.mutationOptions({ onSuccess: refresh }));
  const archive = useMutation(trpc.wish.archive.mutationOptions({ onSuccess: refresh }));
  const restore = useMutation(trpc.wish.restore.mutationOptions({ onSuccess: refresh }));
  const remove = useMutation(trpc.wish.delete.mutationOptions({ onSuccess: refresh }));
  const move = useMutation(
    trpc.wish.move.mutationOptions({
      onMutate: async ({ wishId, toIndex }) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData(listKey);
        queryClient.setQueryData(listKey, (list) => list && moveItem(list, wishId, toIndex));
        return { previous };
      },
      onError: (_error, _input, context) => queryClient.setQueryData(listKey, context?.previous),
      onSuccess: (list) => {
        queryClient.setQueryData(listKey, list);
        void queryClient.invalidateQueries({ queryKey: trpc.wish.groupView.pathKey() });
      },
    })
  );
  return { create, update, archive, restore, remove, move, refresh };
};
