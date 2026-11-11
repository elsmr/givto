import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useGiftDayError } from '../use-gift-day-error';
import { useRefreshGiftDay } from '../use-refresh-gift-day';
import { canRevealIn, currentGiftCount, presenterPhase, type PresenterOrder, type PresenterView } from './presenter-phase';
import { useAdvance } from './use-advance';
import type { SpinStatus } from './who-is-next-reel';

type Input = { groupSlug: string; editionNumber: number; view: PresenterView; order: PresenterOrder; skipSpin: boolean };

/** What next / previous / last mean in each presenter phase. Progress lives on the server. */
export const usePresenterActions = ({ groupSlug, editionNumber, view, order, skipSpin }: Input) => {
  const { advance, isPending } = useAdvance(groupSlug, editionNumber);
  const trpc = useTRPC();
  const refresh = useRefreshGiftDay();
  const onError = useGiftDayError();
  const reveal = useMutation(trpc.giftday.reveal.mutationOptions({ onSuccess: refresh, onError }));
  const [showEnd, setShowEnd] = useState(false);
  // Per turn: the reel's state for the turn it was started on.
  const [spin, setSpin] = useState<{ turn: number; status: SpinStatus }>({ turn: 0, status: 'idle' });
  const phase = presenterPhase(order, view, showEnd);
  const spinStatus: SpinStatus = spin.turn === order.turn ? spin.status : 'idle';
  const step = (action: Parameters<typeof advance>[0]) => advance(action, order.turnsTaken);
  const onLanded = () => advance('spin', order.turnsTaken);
  const oneByOne = view.unwrapMode === 'oneByOne';
  // A known gift count (63) decides when they're done: no "that was the last one".
  const counted = currentGiftCount(order) !== null;

  const next = () => {
    if (phase === 'intro') step('start');
    else if (phase === 'spin') setSpin({ turn: order.turn, status: spinStatus === 'idle' && !skipSpin ? 'spinning' : 'skipped' });
    else if (phase === 'turn' && order.santaToShow) step(order.voteStep === 'ready' ? 'vote' : order.voteStep === 'open' ? 'tally' : 'santa');
    else if (phase === 'turn') step(oneByOne ? 'more' : 'last');
    else if (phase === 'reveal' && !view.reveal.revealed) reveal.mutate({ groupSlug, editionNumber });
    else if (phase === 'reveal') setShowEnd(true);
  };
  const previous = () => {
    if (phase === 'end' && showEnd && canRevealIn(view)) setShowEnd(false);
    else if (phase !== 'intro') step('back');
  };
  // Guess your Santa (62): their Santa comes out before the turn can end.
  const santaToShow = phase === 'turn' && order.santaToShow;
  const last = oneByOne && phase === 'turn' && !counted && !santaToShow ? () => step('last') : undefined;
  // Live voting (83) comes first: open the vote, close it, then the Santa.
  const voteStep = santaToShow ? order.voteStep : null;
  return { phase, spinStatus, onLanded, next, previous, last, counted, santaToShow, voteStep, revealed: view.reveal.revealed, busy: isPending || reveal.isPending };
};
