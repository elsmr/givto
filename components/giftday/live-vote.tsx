import type { EditionInput } from '@/components/between/edition-input';
import { useGuessError } from '@/components/guess/use-guess-error';
import { Button } from '@/components/ui/button';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useRefreshGiftDay } from './use-refresh-gift-day';

type Vote = NonNullable<RouterOutputs['giftday']['get']['vote']>;

const name = (chunks: ReactNode) => <strong>{chunks}</strong>;

/** Live voting (83): votes per name once the presenter closed the vote, most first. `large` for the presenter. */
export const VoteTally = ({ tally, large = false }: { tally: NonNullable<Vote['tally']>; large?: boolean }) => {
  const t = useTranslations('guess.vote');
  // The presenter's slide has no h2 above it; on the group page it sits under the gift day h2.
  const Heading = large ? 'h2' : 'h3';

  return (
    <section className={cn('flex flex-col gap-2', large && 'items-center')}>
      <Heading className={cn('font-heading font-bold', large ? 'text-2xl sm:text-4xl' : 'text-lg')}>{t('tally')}</Heading>
      {tally.length === 0 ? (
        <p className={cn('text-muted', large && 'text-xl sm:text-3xl')}>{t('no-votes')}</p>
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
              <span className="text-muted">{t('votes', { votes: entry.votes })}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

/**
 * On everyone's phone while the presenter has the vote open: who do you think it's from? A tap votes,
 * another name changes it. Then the tally and your own vote.
 */
export const LiveVote = ({ vote, input }: { vote: Vote; input: EditionInput }) => {
  const t = useTranslations('guess.vote');
  const trpc = useTRPC();
  const refresh = useRefreshGiftDay();
  const onError = useGuessError();
  const cast = useMutation(trpc.giftday.vote.mutationOptions({ onSuccess: refresh, onError }));

  return (
    <div aria-live="polite" className="flex flex-col gap-2">
      {!vote.open ? (
        <>
          {vote.tally && <VoteTally tally={vote.tally} />}
          {vote.mine && <p>{t.rich('yours', { choice: vote.mine.name, name })}</p>}
        </>
      ) : vote.people.length === 0 ? (
        <p className="font-semibold">{t('waiting')}</p>
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className="font-heading text-lg font-bold">{t('ask')}</legend>
          <p className="text-muted">{t('hint')}</p>
          <div className="flex flex-wrap gap-2">
            {vote.people.map((person) => {
              const picked = vote.mine?.memberId === person.memberId;
              return (
                <Button
                  key={person.memberId}
                  variant={picked ? 'default' : 'neutral'}
                  aria-pressed={picked}
                  onClick={() => !cast.isPending && cast.mutate({ ...input, memberId: person.memberId })}
                >
                  {picked && <Check aria-hidden="true" />}
                  {person.name}
                </Button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
};
