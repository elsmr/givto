import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { useGiftDay } from '@/components/giftday/use-gift-day';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardDivider, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Lock, VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { GuessDialog } from './guess-dialog';
import { GuessScoreboard } from './guess-scoreboard';
import { GuessVerdict } from './guess-verdict';

const name = (chunks: ReactNode) => <strong className="font-heading break-words">{chunks}</strong>;

/**
 * Guess your Santa (62) on the overview: make my one guess while shopping, then it's locked; my
 * answer once my Santa is out (my turn on gift day, or the big reveal), and everyone's so far.
 */
export const GuessCard = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('guess.card');
  const trpc = useTRPC();
  const input = { groupSlug: group.slug, editionNumber: edition.number };
  const mine = useQuery({ ...trpc.guess.mine.queryOptions(input), refetchInterval: edition.status === 'giftday' ? 10_000 : false });
  const giftDay = useGiftDay(input, edition.status);

  if (!mine.data) return null;
  const { open, guess, people, result } = mine.data;
  const guessing = giftDay.data?.guessing;
  // Once the big reveal is out, its card is the scoreboard.
  const soFar = !giftDay.data?.reveal.revealed && guessing && guessing.results.length > 0 ? guessing : null;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={VenetianMask} tone="primary-muted">
          {t('title')}
        </IconCardTitle>
        {open && <CardDescription>{`${t('open')} ${t('when')}`}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {open && <GuessDialog input={input} people={people} />}
        {result ? (
          <div className="flex flex-col gap-2">
            <p className="text-lg">{t.rich('from', { santa: result.santa, name })}</p>
            {guess ? (
              <p className="flex flex-wrap items-center gap-2">
                <span>{t.rich('you-guessed', { guess: guess.name, name })}</span>
                <GuessVerdict right={result.right} />
              </p>
            ) : (
              <p className="text-muted">{t('no-guess')}</p>
            )}
          </div>
        ) : guess ? (
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2 text-lg">
              <span>{t.rich('you-guessed', { guess: guess.name, name })}</span>
              <Badge variant="yellow">
                <Lock aria-hidden="true" />
                {t('locked')}
              </Badge>
            </p>
            <p className="text-muted">{t('when')}</p>
          </div>
        ) : (
          !open && <p className="text-muted">{t('closed')}</p>
        )}
        {soFar && (
          <>
            <CardDivider />
            <h3 className="font-heading text-lg font-bold">{t('so-far')}</h3>
            <GuessScoreboard guessing={soFar} />
          </>
        )}
      </CardContent>
    </Card>
  );
};
