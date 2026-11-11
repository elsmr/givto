import type { EditionInput } from '@/components/between/edition-input';
import { useGuessError } from '@/components/guess/use-guess-error';
import { Button } from '@/components/ui/button';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

type GuessResult = NonNullable<RouterOutputs['giftday']['get']['guessing']>['results'][number];

const name = (chunks: ReactNode) => <strong>{chunks}</strong>;

/** How many guessed each name for a giftee (94), most first, once their Santa is out. `large` for the presenter. */
export const GuessTally = ({ tally, large = false }: { tally: GuessResult['tally']; large?: boolean }) => {
  const t = useTranslations('guess.live');
  // The presenter's slide has no h2 above it; on the group page it sits under the gift day h2.
  const Heading = large ? 'h2' : 'h3';

  return (
    <section className={cn('flex flex-col gap-2', large && 'items-center')}>
      <Heading className={cn('font-heading font-bold', large ? 'text-2xl sm:text-4xl' : 'text-lg')}>{t('tally')}</Heading>
      {tally.length === 0 ? (
        <p className={cn('text-muted', large && 'text-xl sm:text-3xl')}>{t('no-guesses')}</p>
      ) : (
        <ol aria-label={t('tally')} className={cn('flex flex-wrap gap-2', large && 'justify-center gap-4')}>
          {tally.map((entry) => (
            <li
              key={entry.memberId}
              className={cn(
                'flex items-center gap-2 bg-surface px-3 py-1 text-ink bordered',
                large && 'px-5 py-2 text-xl shadow-sm sm:text-3xl dark:border-control'
              )}
            >
              <span className="font-semibold break-words">{entry.name}</span>
              <span className="text-muted">{t('guesses', { count: entry.count })}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

type LiveGuessProps = { input: EditionInput; current: { memberId: string; name: string }; result: GuessResult | undefined };

/**
 * On everyone's phone at a turn (94): my guess for who the gift is from, a tap sets or changes it, until the Santa is
 * shown; then the tally and my guess. Nothing for their Santa, who has no row for their own giftee.
 */
export const LiveGuess = ({ input, current, result }: LiveGuessProps) => {
  const t = useTranslations('guess');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onError = useGuessError();
  const mine = useQuery(trpc.guess.get.queryOptions(input));
  const set = useMutation(
    trpc.guess.set.mutationOptions({ onError, onSettled: () => queryClient.invalidateQueries(trpc.guess.get.pathFilter()) })
  );
  const row = mine.data?.rows.find((r) => r.memberId === current.memberId);

  if (!row) return null;
  if (result) {
    return (
      <div aria-live="polite" className="flex flex-col gap-2">
        <GuessTally tally={result.tally} />
        {row.santa && <p>{t.rich('card.you-guessed', { guess: row.santa.name, name })}</p>}
      </div>
    );
  }
  if (!row.open) return null;
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-heading text-lg font-bold">{t('live.ask')}</legend>
      <p className="text-muted">{t('live.hint')}</p>
      <div className="flex flex-wrap gap-2">
        {mine.data!.people
          .filter((person) => person.memberId !== current.memberId)
          .map((person) => {
            const picked = row.santa?.memberId === person.memberId;
            return (
              <Button
                key={person.memberId}
                variant={picked ? 'default' : 'neutral'}
                aria-pressed={picked}
                onClick={() => !set.isPending && set.mutate({ ...input, rows: [{ gifteeMemberId: current.memberId, santaMemberId: person.memberId }] })}
              >
                {picked && <Check aria-hidden="true" />}
                {person.name}
              </Button>
            );
          })}
      </div>
    </fieldset>
  );
};
