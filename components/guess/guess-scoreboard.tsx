import { RevealPairs } from '@/components/giftday/reveal-pairs';
import type { RouterOutputs } from '@/lib/client/trpc';
import { GuessLeaderboard } from './guess-leaderboard';
import { GuessScore } from './guess-score';

type Guessing = NonNullable<RouterOutputs['giftday']['get']['guessing']>;

/** Guess your Santa (62): how many guessed right, the leaderboard (82), then each pair with its guess. `large` for the presenter. */
export const GuessScoreboard = ({ guessing, large = false }: { guessing: Guessing; large?: boolean }) => (
  <div className="flex w-full flex-col gap-4 text-left">
    <GuessScore right={guessing.right} total={guessing.results.length} large={large} />
    <GuessLeaderboard leaderboard={guessing.leaderboard} large={large} />
    <RevealPairs pairs={guessing.results} large={large} />
  </div>
);
