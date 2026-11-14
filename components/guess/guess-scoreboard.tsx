import { RevealPairs } from '@/components/giftday/reveal-pairs';
import type { RouterOutputs } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GuessLeaderboard } from './guess-leaderboard';

type Guessing = NonNullable<RouterOutputs['giftday']['get']['guessing']>;

/** Guess your Santa (62): how many guessed right, the leaderboard (82), then each pair with its guess. `large` for the presenter. */
export const GuessScoreboard = ({ guessing, large = false }: { guessing: Guessing; large?: boolean }) => {
  const t = useTranslations('guess.result');

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <p className={cn('flex items-center gap-2 font-semibold', large && 'justify-center gap-3 text-2xl sm:text-4xl')}>
        <Trophy aria-hidden="true" className={large ? 'size-8 sm:size-10' : 'size-5'} />
        {t('score', { right: guessing.right, total: guessing.results.length })}
      </p>
      <GuessLeaderboard leaderboard={guessing.leaderboard} large={large} />
      <RevealPairs pairs={guessing.results} large={large} />
    </div>
  );
};
