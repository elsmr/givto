import { GuessVerdict } from '@/components/guess/guess-verdict';
import { cn } from '@/lib/utils';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

/** With Guess your Santa (62) on, each pair also says what the giftee guessed: the scoreboard. */
type Pair = { giftee: string; santa: string; guess?: string | null; right?: boolean };

/** Who was whose Santa, one by one. `large` for the presenter view. */
export const RevealPairs = ({ pairs, large = false }: { pairs: Pair[]; large?: boolean }) => {
  const t = useTranslations('giftday.reveal');
  const tGuess = useTranslations('guess.result');
  const name = (chunks: ReactNode) => <strong className="break-words">{chunks}</strong>;

  return (
    <ul aria-label={t('pairs-label')} className={cn('grid gap-3', large && 'gap-5 md:grid-cols-2 xl:grid-cols-3')}>
      {pairs.map((pair, index) => {
        const delay = large ? 0.4 + index * 0.5 : index * 0.15;
        return (
          <m.li
            key={index}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={cn('flex flex-col gap-2 bg-surface p-3 text-ink bordered shadow-sm', large && 'p-5 text-2xl xl:text-3xl dark:border-control dark:shadow-md dark:shadow-primary')}
          >
            <span>{t.rich('pair', { giftee: pair.giftee, santa: pair.santa, name })}</span>
            {pair.right !== undefined && (
              <span className={cn('flex flex-wrap items-center gap-2 text-sm', large && 'text-xl xl:text-2xl')}>
                {pair.guess ? (
                  <>
                    <span>{tGuess.rich('guessed', { guess: pair.guess, name })}</span>
                    <GuessVerdict right={pair.right} delay={delay + 0.3} />
                  </>
                ) : (
                  <span className="text-muted">{tGuess('no-guess')}</span>
                )}
              </span>
            )}
          </m.li>
        );
      })}
    </ul>
  );
};
