import type { RouterOutputs } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type Leaderboard = NonNullable<RouterOutputs['giftday']['get']['guessing']>['leaderboard'];

/** Guess the whole draw (82): points for the pairs that are out, most first; ties share a place. `large` for the presenter. */
export const GuessLeaderboard = ({ leaderboard, large = false }: { leaderboard: Leaderboard; large?: boolean }) => {
  const t = useTranslations('guess.result');

  if (leaderboard.length === 0) return null;
  return (
    <section className={cn('flex flex-col gap-2', large && 'items-center')}>
      <h3 className={cn('font-heading font-bold', large ? 'text-2xl sm:text-4xl' : 'text-lg')}>{t('leaderboard')}</h3>
      <ol aria-label={t('leaderboard')} className={cn('flex flex-wrap gap-2', large && 'justify-center gap-4')}>
        {leaderboard.map((entry) => (
          <li
            key={entry.memberId}
            className={cn(
              'flex items-center gap-2 bg-surface px-3 py-1 text-ink bordered',
              large && 'px-5 py-2 text-xl shadow-sm sm:text-3xl dark:border-control'
            )}
          >
            <span className="font-bold tabular-nums">{leaderboard.filter((other) => other.points > entry.points).length + 1}.</span>
            <span className="font-semibold break-words">{entry.name}</span>
            <span className="text-muted">{t('points', { points: entry.points })}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};
