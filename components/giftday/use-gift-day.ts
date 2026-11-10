import type { EditionInput } from '@/components/between/edition-input';
import { useTRPC } from '@/lib/client/trpc';
import type { EditionStatus } from '@/lib/schema/edition';
import { useQuery } from '@tanstack/react-query';

const afterDraw = new Set<EditionStatus>(['drawn', 'giftday', 'done']);

/** Unwrap order, mode and big reveal from the draw on; on gift day other phones follow the presenter's turns. */
export const useGiftDay = (input: EditionInput, status: EditionStatus) => {
  const trpc = useTRPC();
  return useQuery({
    ...trpc.giftday.get.queryOptions(input),
    enabled: afterDraw.has(status),
    refetchInterval: status === 'giftday' ? 10_000 : false,
  });
};
