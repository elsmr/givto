import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useGiftDayError } from '../use-gift-day-error';
import { useRefreshGiftDay } from '../use-refresh-gift-day';
import { PresenterSlide } from './presenter-slide';
import { presenterSteps, type PresenterView } from './presenter-steps';
import { usePresenterKeys } from './use-presenter-keys';

type PresenterStageProps = { groupSlug: string; editionNumber: number; view: PresenterView };

/** "Who's next" on a shared screen: one step at a time, arrows/space or the buttons. */
export const PresenterStage = ({ groupSlug, editionNumber, view }: PresenterStageProps) => {
  const t = useTranslations('giftday.present');
  const trpc = useTRPC();
  const refresh = useRefreshGiftDay();
  const onError = useGiftDayError();
  const reveal = useMutation(trpc.giftday.reveal.mutationOptions({ onSuccess: refresh, onError }));
  const steps = presenterSteps(view);
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const go = (to: number) => setIndex(Math.max(0, Math.min(to, steps.length - 1)));
  const onReveal = () => reveal.mutate({ groupSlug, editionNumber });
  const next = () => {
    // On the reveal step, "next" reveals first; the step after it comes on the next press.
    if (step.kind === 'reveal' && !view.reveal.revealed) {
      if (!reveal.isPending) onReveal();
      return;
    }
    go(index + 1);
  };
  usePresenterKeys({ next, previous: () => go(index - 1), first: () => go(0), last: () => go(steps.length - 1) });

  return (
    <div className="flex flex-1 flex-col">
      <div aria-live="polite" className="flex flex-1 items-center justify-center overflow-hidden px-6 py-10">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={index}
            initial={{ opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -48, scale: 0.96 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex w-full max-w-7xl flex-col items-center gap-8 text-center"
          >
            <PresenterSlide step={step} view={view} onReveal={onReveal} revealing={reveal.isPending} />
          </m.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between gap-4 px-6 pb-6">
        <Button variant="neutral" size="lg" disabled={index === 0} onClick={() => go(index - 1)}>
          <ArrowLeft aria-hidden="true" />
          {t('previous')}
        </Button>
        <p className="hidden text-white/90 sm:block">{t('keys')}</p>
        <Button variant="neutral" size="lg" disabled={step.kind === 'end'} onClick={next}>
          {t('next')}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};
