import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RevealPairs } from '../reveal-pairs';
import type { PresenterStep, PresenterView } from './presenter-steps';

type PresenterSlideProps = { step: PresenterStep; view: PresenterView; onReveal: () => void; revealing: boolean };

const hint = 'text-xl text-white/90 sm:text-2xl';

/** One presenter step in big type. Santas only on the reveal step, once revealed. */
export const PresenterSlide = ({ step, view, onReveal, revealing }: PresenterSlideProps) => {
  const t = useTranslations('giftday');

  if (step.kind === 'person') {
    return (
      <>
        <p className="text-2xl font-semibold text-white sm:text-4xl">{t('present.next-up')}</p>
        <p className="max-w-full bg-yellow px-8 py-6 font-heading text-[clamp(3rem,11vw,11rem)] leading-none font-extrabold break-words text-ink bordered shadow-lg">
          {step.name}
        </p>
        <p className={hint}>{t('present.step', { current: step.number, total: step.total })}</p>
      </>
    );
  }
  if (step.kind === 'reveal') {
    return (
      <>
        <h2 className="text-5xl font-extrabold text-white sm:text-7xl">{t('reveal.title')}</h2>
        {view.reveal.pairs ? (
          <div className="w-full text-left">
            <RevealPairs pairs={view.reveal.pairs} large />
          </div>
        ) : (
          <>
            <p className={hint}>{t('present.reveal-hint')}</p>
            <Button size="lg" variant="neutral" disabled={revealing} onClick={onReveal}>
              <Sparkles aria-hidden="true" />
              {t('reveal.button')}
            </Button>
          </>
        )}
      </>
    );
  }
  return (
    <>
      <LogoAnimation variant="celebrate" className="size-32 sm:size-44" />
      <h2 className="text-5xl font-extrabold text-white sm:text-8xl">
        {step.kind === 'end' ? t('present.end-title') : view.status === 'drawn' ? view.title : t('hero.title')}
      </h2>
      <p className={hint}>{step.kind === 'intro' ? t('present.intro-hint') : t('present.end-hint')}</p>
    </>
  );
};
