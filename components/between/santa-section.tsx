import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useGifteeRevealed } from '@/components/draw/use-giftee-revealed';
import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { EditionInput } from './edition-input';
import { GifteeTips } from './giftee-tips';
import { PsstPanel } from './psst-panel';
import { SantaQuestions } from './santa-questions';

/** Your giftee: tips others left for you, Psst! and anonymous questions. Renders nothing before the draw or outside it. */
export const SantaSection = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.santa');
  const trpc = useTRPC();
  const tips = useQuery(trpc.tip.forGiftee.queryOptions(input));
  const [revealed] = useGifteeRevealed(input.groupSlug, input.editionNumber);

  if (tips.isPending) return <Skeleton className="h-64" />;
  // Names the giftee: stays hidden until the reveal card is tapped.
  if (!tips.data || !revealed) return null;
  const name = tips.data.giftee.name;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Lightbulb} tone="yellow">
          {t('title', { name })}
        </IconCardTitle>
        <CardDescription>{t('intro', { name })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <GifteeTips input={input} view={tips.data} />
        <PsstPanel input={input} />
        <SantaQuestions input={input} />
      </CardContent>
    </Card>
  );
};
