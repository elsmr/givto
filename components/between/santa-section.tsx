import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
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

  if (tips.isPending) return <Skeleton className="h-64" />;
  if (!tips.data) return null;
  const name = tips.data.giftee.name;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title', { name })}</h2>
        </CardTitle>
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
