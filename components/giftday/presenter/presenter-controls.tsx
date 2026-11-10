import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, Check, Dices, Sparkles, VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import type { usePresenterActions } from './use-presenter-actions';

type PresenterControlsProps = {
  actions: ReturnType<typeof usePresenterActions>;
  oneByOne: boolean;
  skipSpin: boolean;
  onSkipSpinChange: (skip: boolean) => void;
};

/** Back, the skip-the-spin option and the action for this phase (with its key hint). */
export const PresenterControls = ({ actions, oneByOne, skipSpin, onSkipSpinChange }: PresenterControlsProps) => {
  const t = useTranslations('giftday');
  const tGuess = useTranslations('guess.present');
  const id = useId();
  const { phase, spinStatus, busy, santaToShow } = actions;
  const byHand = phase === 'turn' && oneByOne && !actions.counted;
  const hint = phase === 'spin' ? t('present.keys-spin') : santaToShow ? tGuess('keys') : byHand ? t('present.keys-one-by-one') : phase === 'turn' && oneByOne ? t('present.keys-counted') : t('present.keys');
  const toSpin = phase === 'spin' && spinStatus === 'idle';
  const toReveal = phase === 'reveal' && !actions.revealed;
  const nextLabel = toSpin
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
      <div className="flex flex-col items-center gap-2">
        <p className="hidden text-muted sm:block">{hint}</p>
        <Field orientation="horizontal" className="w-fit">
          <Switch id={id} size="sm" checked={skipSpin} onCheckedChange={onSkipSpinChange} />
          <FieldLabel htmlFor={id}>{t('present.skip-spin')}</FieldLabel>
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        {actions.last && (
          <Button variant="neutral" size="lg" disabled={busy} onClick={actions.last}>
            <Check aria-hidden="true" />
            {t('present.last')}
          </Button>
        )}
        {phase !== 'end' && (
          <Button size="lg" disabled={busy} onClick={actions.next}>
            {toSpin && <Dices aria-hidden="true" />}
            {toReveal && <Sparkles aria-hidden="true" />}
            {santaToShow && <VenetianMask aria-hidden="true" />}
            {nextLabel}
            {!toSpin && !toReveal && !santaToShow && <ArrowRight aria-hidden="true" />}
          </Button>
        )}
      </div>
    </div>
  );
};
