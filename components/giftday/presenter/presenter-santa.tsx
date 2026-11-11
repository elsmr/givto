import { GuessLeaderboard } from '@/components/guess/guess-leaderboard';
import { GuessVerdict } from '@/components/guess/guess-verdict';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { GuessTally } from '../live-guess';
import { Confetti } from './confetti';
import type { PresenterGuessResult, PresenterView } from './presenter-phase';

const name = (chunks: ReactNode) => <strong className="font-heading break-words">{chunks}</strong>;

type PresenterSantaProps = { result: PresenterGuessResult; leaderboard: NonNullable<PresenterView['guessing']>['leaderboard'] };

/** Guess your Santa (62) at the turn, once they've unwrapped: "From Bob · You guessed Cee ✓", everyone's tally (94), then the leaderboard (82). */
export const PresenterSanta = ({ result, leaderboard }: PresenterSantaProps) => {
  const t = useTranslations('guess.present');
  const reduced = useReducedMotion();

  // Grows open instead of popping in, so the centred turn above glides up rather than jumps.
  return (
    <m.div
      initial={reduced ? false : { height: 0 }}
      animate={{ height: 'auto' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center gap-4 overflow-hidden p-2"
    >
      {result.right && <Confetti />}
      <m.p
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-primary-muted px-6 py-3 text-3xl text-ink bordered shadow-md sm:text-6xl dark:border-control dark:shadow-primary"
      >
        {t.rich('from', { santa: result.santa, name })}
      </m.p>
      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-4 text-2xl sm:text-4xl"
      >
        {result.guess ? (
          <>
            <span>{t.rich('you-guessed', { guess: result.guess, name })}</span>
            <GuessVerdict right={result.right} large delay={0.6} />
          </>
        ) : (
          <span className="text-muted">{t('no-guess')}</span>
        )}
      </m.p>
      <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.3 }} className="flex flex-col items-center gap-4">
        <GuessTally tally={result.tally} large />
        <GuessLeaderboard leaderboard={leaderboard} large />
      </m.div>
    </m.div>
  );
};
