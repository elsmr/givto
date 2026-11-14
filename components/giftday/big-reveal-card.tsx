import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RouterOutputs } from '@/lib/client/trpc';
import { useTranslations } from 'next-intl';
import { GuessScoreboard } from '@/components/guess/guess-scoreboard';
import { RevealPairs } from './reveal-pairs';

type BigRevealCardProps = {
  reveal: RouterOutputs['giftday']['get']['reveal'];
  /** Guess your Santa (62): once revealed, the pairs come with everyone's guess, the scoreboard. */
  guessing: RouterOutputs['giftday']['get']['guessing'];
};

/** The big reveal (31) once it's out, and every done edition (100): who was whose Santa. The switch is in the settings. */
export const BigRevealCard = ({ reveal, guessing }: BigRevealCardProps) => {
  const t = useTranslations('giftday.reveal');

  if (!reveal.pairs) return null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <LogoAnimation variant="celebrate" className="size-12 shrink-0" />
          <CardTitle>
            <h2>{t('title')}</h2>
          </CardTitle>
        </div>
        <CardDescription>{t('revealed')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {guessing && <GuessScoreboard guessing={guessing} />}
        {/* Without the big reveal, the scoreboard only has the Santas shown on gift day. */}
        {(!guessing || !reveal.revealed) && <RevealPairs pairs={reveal.pairs} />}
      </CardContent>
    </Card>
  );
};
