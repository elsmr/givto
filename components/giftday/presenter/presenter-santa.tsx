import { GuessVerdict } from '@/components/guess/guess-verdict';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Confetti } from './confetti';
import type { PresenterGuessResult } from './presenter-phase';

const name = (chunks: ReactNode) => <strong className="font-heading break-words">{chunks}</strong>;

/** Guess your Santa (62) at the turn, once they've unwrapped: "From Bob · You guessed Cee ✓". */
export const PresenterSanta = ({ result }: { result: PresenterGuessResult }) => {
  const t = useTranslations('guess.present');

  return (
    <div className="flex flex-col items-center gap-4">
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
    </div>
  );
};
