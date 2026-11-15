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
  // White elephant (89): the turn ends with an opened gift; steals (and the final swaps) are on the table.
  const swapTurn = phase === 'turn' && actions.swap;
  const finalSteal = swapTurn && swapTurn.final;
  const byHand = phase === 'turn' && oneByOne && !actions.counted;
  const toSpin = phase === 'spin' && spinStatus === 'idle';
  const toReveal = phase === 'reveal' && !actions.revealed;
  const nextLabel = swapTurn
    ? tSwap('open')
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
    // Pinned to the bottom of the screen, also when a slide is taller than it. On a phone the gift label takes its own row
    // and Previous is just its arrow, so Previous and the action share one row and the table keeps the room.
    <form
      className="sticky bottom-0 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 bg-page px-6 pt-2 pb-4"
      onSubmit={(event) => {
        event.preventDefault();
        actions.next();
      }}
    >
      <Button type="button" variant="neutral" size="lg" disabled={phase === 'intro' || busy} onClick={actions.previous}>
        <ArrowLeft aria-hidden="true" />
        <span className="max-sm:sr-only">{t('present.previous')}</span>
      </Button>
      {swapTurn && !finalSteal && (
        <Field className="order-first basis-full sm:order-none sm:ml-auto sm:basis-56">
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
      <div className="flex flex-wrap items-end gap-3">
        {actions.last && (
          <Button type="button" variant="neutral" size="lg" disabled={busy} onClick={actions.last}>
            <Check aria-hidden="true" />
            {t('present.last')}
          </Button>
        )}
        {/* Not the form's submit: keeping is a choice, no key press makes it. */}
        {finalSteal && (
          <Button type="button" size="lg" disabled={busy} onClick={actions.keep}>
            {tSwap('keep')}
          </Button>
        )}
        {phase !== 'end' && !finalSteal && (
          <Button type="submit" size="lg" disabled={busy}>
            {swapTurn && <Gift aria-hidden="true" />}
            {toSpin && <Dices aria-hidden="true" />}
            {toReveal && <Sparkles aria-hidden="true" />}
            {santaToShow && <VenetianMask aria-hidden="true" />}
            {nextLabel}
            {!toSpin && !toReveal && !santaToShow && !swapTurn && <ArrowRight aria-hidden="true" />}
          </Button>
        )}
      </div>
    </form>
  );
};
