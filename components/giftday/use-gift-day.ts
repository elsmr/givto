import type { EditionInput } from '@/components/between/edition-input';
import { useTRPC } from '@/lib/client/trpc';
import { isBeforeDraw, type EditionStatus } from '@/lib/schema/edition';
import { useQuery } from '@tanstack/react-query';

/**
 * Unwrap order, mode and big reveal from the draw on; on gift day other phones follow the presenter's turns,
 * quicker while the unwrapping is under way with Guess your Santa on, so guessing at a turn (94) closes in time.
 */
export const useGiftDay = (input: EditionInput, status: EditionStatus) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.giftday.get.queryOptions(input),
    enabled: !isBeforeDraw({ status }),
    refetchInterval: ({ state: { data } }) =>
      status !== 'giftday' ? false : data?.guessing && data.unwrapOrder?.started && !data.unwrapOrder.finished ? 3_000 : 10_000,
  });
};
