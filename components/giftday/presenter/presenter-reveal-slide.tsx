import { GuessScoreboard } from '@/components/guess/guess-scoreboard';
import { useTranslations } from 'next-intl';
import { RevealPairs } from '../reveal-pairs';
import { Confetti } from './confetti';
import type { PresenterView } from './presenter-phase';

type PresenterRevealSlideProps = { reveal: PresenterView['reveal']; guessing: PresenterView['guessing'] };

/** The big reveal at the end: the pairs once revealed (with Guess your Santa (62): the scoreboard), else the hint to reveal. */
export const PresenterRevealSlide = ({ reveal, guessing }: PresenterRevealSlideProps) => {
  const t = useTranslations('giftday');

  return (
    <>
      <h2 className="text-5xl font-extrabold sm:text-7xl">{t('reveal.title')}</h2>
      {reveal.pairs ? (
        <div className="w-full text-left">
          <Confetti />
          {guessing ? <GuessScoreboard guessing={guessing} large /> : <RevealPairs pairs={reveal.pairs} large />}
        </div>
      ) : (
        <p className="text-xl text-muted sm:text-2xl">{t('present.reveal-hint')}</p>
      )}
    </>
  );
};
