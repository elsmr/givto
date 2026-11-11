import type { EditionInput } from '@/components/between/edition-input';
import { useTRPC } from '@/lib/client/trpc';
import { isBeforeDraw, type EditionStatus } from '@/lib/schema/edition';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import superjson from 'superjson';

/** Unwrap order, mode and big reveal from the draw on; the page's `useGiftDayStream` keeps it current. */
export const useGiftDay = (input: EditionInput, status: EditionStatus) => {
  const trpc = useTRPC();
  return useQuery({ ...trpc.giftday.get.queryOptions(input), enabled: !isBeforeDraw({ status }) });
};

/**
 * The server pushes the gift day view after every change, so phones follow the presenter (97). One per page: the other
 * `useGiftDay` callers read the same cache. EventSource reconnects by itself and gets the current view first.
 */
export const useGiftDayStream = ({ groupSlug, editionNumber }: EditionInput, enabled: boolean) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const queryKey = trpc.giftday.get.queryKey({ groupSlug, editionNumber });
    const source = new EventSource(`/api/giftday/${encodeURIComponent(groupSlug)}/${editionNumber}`);
    source.onmessage = (event) => queryClient.setQueryData(queryKey, superjson.parse(event.data));
    return () => source.close();
  }, [trpc, queryClient, groupSlug, editionNumber, enabled]);
};
