import type { EditionInput } from '@/components/between/edition-input';
import { useTRPC } from '@/lib/client/trpc';
import { isBeforeDraw, type EditionStatus } from '@/lib/schema/edition';
import { useQuery } from '@tanstack/react-query';

/** Unwrap order, mode and big reveal from the draw on; on gift day other phones follow the presenter's turns, every `every` ms. */
export const useGiftDay = (input: EditionInput, status: EditionStatus, every = 10_000) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.giftday.get.queryOptions(input),
    enabled: !isBeforeDraw({ status }),
    refetchInterval: status === 'giftday' && every,
  });
};
