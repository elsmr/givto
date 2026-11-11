import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, ChartNoAxesColumn, Check, Dices, Gift, Sparkles, VenetianMask, Vote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { usePresenterActions } from './use-presenter-actions';

type PresenterControlsProps = { actions: ReturnType<typeof usePresenterActions>; oneByOne: boolean };

/** Previous and the action for this phase, with its key hint. */
export const PresenterControls = ({ actions, oneByOne }: PresenterControlsProps) => {
  const t = useTranslations('giftday');
  const tGuess = useTranslations('guess.present');
  const tVote = useTranslations('guess.vote');
  const tSwap = useTranslations('giftday.swap');
  const { phase, spinStatus, busy, santaToShow, voteStep } = actions;
  // White elephant (89): the turn ends with an opened gift (or, at the final steal, keeping theirs); steals are on the table.
  const swapTurn = phase === 'turn' && actions.swap;
  const byHand = phase === 'turn' && oneByOne && !actions.counted;
  const hint = swapTurn ? tSwap(swapTurn.final ? 'keys-final' : 'keys') : phase === 'spin' ? t('present.keys-spin') : voteStep === 'ready' ? tVote('keys-start') : voteStep === 'open' ? tVote('keys-close') : santaToShow ? tGuess('keys') : byHand ? t('present.keys-one-by-one') : phase === 'turn' && oneByOne ? t('present.keys-counted') : t('present.keys');
  const toSpin = phase === 'spin' && spinStatus === 'idle';
  const toReveal = phase === 'reveal' && !actions.revealed;
  const nextLabel = swapTurn
    ? tSwap(swapTurn.final ? 'keep' : 'open')
    : toSpin
      ? t('present.spin')
      : voteStep === 'ready'
        ? tVote('start')
        : voteStep === 'open'
          ? tVote('close')
          : santaToShow
            ? tGuess('show')
            : phase === 'spin'
              ? t('present.skip')
              : toReveal
                ? t('reveal.button')
                : byHand
                  ? t('present.more')
                  : t('present.next');

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-6">
      <Button variant="neutral" size="lg" disabled={phase === 'intro' || busy} onClick={actions.previous}>
        <ArrowLeft aria-hidden="true" />
        {t('present.previous')}
      </Button>
      <p className="hidden text-muted sm:block">{hint}</p>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          actions.next();
        }}
      >
        {swapTurn && !swapTurn.final && (
          <Input
            type="text"
            aria-label={tSwap('label')}
            placeholder={tSwap('label-placeholder')}
            maxLength={60}
            value={actions.label}
            onChange={(event) => actions.setLabel(event.target.value)}
            className="w-56"
          />
        )}
        {actions.last && (
          <Button type="button" variant="neutral" size="lg" disabled={busy} onClick={actions.last}>
            <Check aria-hidden="true" />
            {t('present.last')}
          </Button>
        )}
        {phase !== 'end' && (
          <Button type="submit" size="lg" disabled={busy}>
            {swapTurn && !swapTurn.final && <Gift aria-hidden="true" />}
            {toSpin && <Dices aria-hidden="true" />}
            {toReveal && <Sparkles aria-hidden="true" />}
            {voteStep === 'ready' && <Vote aria-hidden="true" />}
            {voteStep === 'open' && <ChartNoAxesColumn aria-hidden="true" />}
            {voteStep === 'closed' && <VenetianMask aria-hidden="true" />}
            {nextLabel}
            {!toSpin && !toReveal && !santaToShow && !swapTurn && <ArrowRight aria-hidden="true" />}
          </Button>
        )}
      </form>
    </div>
  );
};
