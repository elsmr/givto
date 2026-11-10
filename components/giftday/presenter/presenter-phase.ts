import type { RouterOutputs } from '@/lib/client/trpc';

export type PresenterView = RouterOutputs['giftday']['presenter'];
export type PresenterOrder = NonNullable<PresenterView['unwrapOrder']>;
export type PresenterPhase = 'intro' | 'spin' | 'turn' | 'reveal' | 'end';

/** How many gifts the current person gets (63), or null when their Santa marked nothing. */
export const currentGiftCount = (order: PresenterOrder) => order.people.find((p) => p.memberId === order.current?.memberId)?.gifts ?? null;

export const canRevealIn = (view: PresenterView) =>
  view.reveal.enabled && (view.status === 'giftday' || view.status === 'done');

/** Where the presenter is, from the stored progress: the server decides whose turn it is. */
export const presenterPhase = (order: PresenterOrder, view: PresenterView, showEnd: boolean): PresenterPhase => {
  if (!order.started) return 'intro';
  if (!order.finished) return order.currentShown ? 'turn' : 'spin';
  return canRevealIn(view) && !showEnd ? 'reveal' : 'end';
};
