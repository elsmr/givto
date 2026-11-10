import { IconTile } from '@/components/ui/icon-tile';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RouterOutputs } from '@/lib/client/trpc';
import type { EditionStatus } from '@/lib/schema/edition';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GuessScoreboard } from '@/components/guess/guess-scoreboard';
import { RevealButton } from './reveal-button';
import { RevealPairs } from './reveal-pairs';
import { RevealSwitch } from './reveal-switch';

type BigRevealCardProps = {
  groupSlug: string;
  editionNumber: number;
  reveal: RouterOutputs['giftday']['get']['reveal'];
  /** Guess your Santa (62): once revealed, the pairs come with everyone's guess, the scoreboard. */
  guessing: RouterOutputs['giftday']['get']['guessing'];
  status: EditionStatus;
  manage: boolean;
};

/**
 * The big reveal (31): the organizer turns it on and reveals it from gift day on; then everyone
 * sees who was whose Santa. Members see nothing of it while it's off.
 */
export const BigRevealCard = ({ groupSlug, editionNumber, reveal, guessing, status, manage }: BigRevealCardProps) => {
  const t = useTranslations('giftday.reveal');
  const fromGiftDay = status === 'giftday' || status === 'done';

  if (!manage && !reveal.enabled) return null;
  const description = reveal.revealed
    ? t('revealed')
    : reveal.enabled && fromGiftDay
      ? t('ready')
      : manage
        ? t('switch-help')
        : t('teaser');
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {reveal.revealed ? (
            <LogoAnimation variant="celebrate" className="size-12 shrink-0" />
          ) : (
            <IconTile icon={Sparkles} tone="primary-muted" />
          )}
          <CardTitle>
            <h2>{t('title')}</h2>
          </CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {reveal.pairs && (guessing ? <GuessScoreboard guessing={guessing} /> : <RevealPairs pairs={reveal.pairs} />)}
        {manage && <RevealSwitch groupSlug={groupSlug} editionNumber={editionNumber} enabled={reveal.enabled} />}
        {manage && reveal.enabled && fromGiftDay && !reveal.revealed && (
          <RevealButton groupSlug={groupSlug} editionNumber={editionNumber} className="h-auto min-h-13 self-start py-2 whitespace-normal" />
        )}
      </CardContent>
    </Card>
  );
};
