import { useTRPC } from '@/lib/client/trpc';
import { useQueryClient } from '@tanstack/react-query';

/** Refetch the group home after an organizer or membership change. */
export const useInvalidateGroup = (groupSlug: string) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: trpc.group.get.queryKey({ groupSlug }) });
};
