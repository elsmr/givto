import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moveItem } from '@/lib/move-item';

/** Create, update, archive, mark received (got it), restore, delete, move and show/hide the signed-in person's wishes; moves and show/hide are optimistic. */
export const useWishMutations = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const listKey = trpc.wish.list.queryKey();
  const groupsKey = trpc.account.groups.queryKey();
  // Also refreshes the per-group views (wish.groupView) and what each group shows (account.groups).
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.wish.pathKey() }),
      queryClient.invalidateQueries({ queryKey: groupsKey }),
    ]);

  const create = useMutation(trpc.wish.create.mutationOptions({ onSuccess: refresh }));
  const update = useMutation(trpc.wish.update.mutationOptions({ onSuccess: refresh }));
  const archive = useMutation(trpc.wish.archive.mutationOptions({ onSuccess: refresh }));
  const receive = useMutation(trpc.giftday.markReceived.mutationOptions({ onSuccess: refresh }));
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
  const setShown = useMutation(
    trpc.wish.setShown.mutationOptions({
      onMutate: async ({ groupSlug, wishId, shown }) => {
        await queryClient.cancelQueries({ queryKey: groupsKey });
        queryClient.setQueryData(groupsKey, (groups) =>
          groups?.map((group) =>
            group.slug !== groupSlug
              ? group
              : { ...group, shownWishIds: shown ? [...group.shownWishIds, wishId] : group.shownWishIds.filter((id) => id !== wishId) }
          )
        );
      },
      onSettled: refresh,
    })
  );
  return { create, update, archive, receive, restore, remove, move, setShown, refresh };
};
