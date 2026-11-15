import { toast } from '@/components/ui/toast';
import { useTRPC, type RouterInputs } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { appErrorCode } from '../../group/app-error-code';
import { useGiftDayError } from '../use-gift-day-error';
import type { PresenterOrder } from './presenter-phase';

type Action = RouterInputs['giftday']['advance']['action'];

/** The presenter's steps, stored on the server; the answer is the new presenter view. */
export const useAdvance = (groupSlug: string, editionNumber: number) => {
  const trpc = useTRPC();
  const t = useTranslations('giftday.present');
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
      // The view refetches by itself, so a step that came too late (or after someone left) needs no reload.
      onError: (error) => {
        if (['EDITION_CHANGED', 'TOO_FEW_PEOPLE'].includes(appErrorCode(error))) toast.add({ title: t('changed'), type: 'error' });
        else onError(error);
        void queryClient.invalidateQueries({ queryKey: presenterKey });
      },
    })
  );
  /** `seen`: the step is for this view of the order (its turns and who's up), refused once that changed. */
  const advance = (action: Action, seen: Pick<PresenterOrder, 'turnsTaken' | 'current'>, swap?: { giftNo?: number; label?: string }) => {
    if (!mutation.isPending) {
      mutation.mutate({ groupSlug, editionNumber, action, turnsTaken: seen.turnsTaken, currentMemberId: seen.current?.memberId ?? null, ...swap });
    }
  };
  return { advance, isPending: mutation.isPending };
};
