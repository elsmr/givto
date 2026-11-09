import { useTranslations } from 'next-intl';
import { RevealPairs } from '../reveal-pairs';
import { Confetti } from './confetti';
import type { PresenterView } from './presenter-phase';

/** The big reveal at the end: the pairs once revealed, else the hint to reveal. */
export const PresenterRevealSlide = ({ reveal }: { reveal: PresenterView['reveal'] }) => {
  const t = useTranslations('giftday');

  return (
    <>
      <h2 className="text-5xl font-extrabold sm:text-7xl">{t('reveal.title')}</h2>
      {reveal.pairs ? (
        <div className="w-full text-left">
          <Confetti />
          <RevealPairs pairs={reveal.pairs} large />
        </div>
      ) : (
        <p className="text-xl text-muted sm:text-2xl">{t('present.reveal-hint')}</p>
      )}
    </>
  );
};
