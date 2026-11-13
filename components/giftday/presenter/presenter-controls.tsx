import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Check, Dices, Gift, Sparkles, VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { usePresenterActions } from './use-presenter-actions';

type PresenterControlsProps = { actions: ReturnType<typeof usePresenterActions>; oneByOne: boolean };

/** Previous and the action for this phase. */
export const PresenterControls = ({ actions, oneByOne }: PresenterControlsProps) => {
  const t = useTranslations('giftday');
  const tGuess = useTranslations('guess.present');
  const tSwap = useTranslations('giftday.swap');
  const labelId = useId();
  const { phase, spinStatus, busy, santaToShow } = actions;
  // White elephant (89): the turn ends with an opened gift (or, at the final steal, keeping theirs); steals are on the table.
  const swapTurn = phase === 'turn' && actions.swap;
  const byHand = phase === 'turn' && oneByOne && !actions.counted;
  const toSpin = phase === 'spin' && spinStatus === 'idle';
  const toReveal = phase === 'reveal' && !actions.revealed;
  const nextLabel = swapTurn
    ? tSwap(swapTurn.final ? 'keep' : 'open')
    : toSpin
      ? t('present.spin')
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
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          actions.next();
        }}
      >
        {swapTurn && !swapTurn.final && (
          <Field className="w-56">
            <FieldLabel htmlFor={labelId}>{tSwap('label')}</FieldLabel>
            <Input
              id={labelId}
              type="text"
              maxLength={60}
              value={actions.label}
              onChange={(event) => actions.setLabel(event.target.value)}
            />
          </Field>
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
            {santaToShow && <VenetianMask aria-hidden="true" />}
            {nextLabel}
            {!toSpin && !toReveal && !santaToShow && !swapTurn && <ArrowRight aria-hidden="true" />}
          </Button>
        )}
      </form>
    </div>
  );
};
