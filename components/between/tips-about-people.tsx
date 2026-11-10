import { IconCardTitle } from '@/components/group/icon-card-title';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AuthoredTip } from './authored-tip';
import type { EditionInput } from './edition-input';
import { NewTipDialog } from './new-tip-dialog';

/** "Tips for someone's Santa" (42): leave a tip about anyone in the draw (in a dialog), and manage your own tips. */
export const TipsAboutPeople = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.tips');
  const trpc = useTRPC();
  const authored = useQuery(trpc.tip.authored.queryOptions(input));

  if (authored.isPending) return <Skeleton className="h-48" />;
  if (!authored.data) return null;
  const { canWrite, people, tips } = authored.data;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Lightbulb} tone="yellow">
          {t('title')}
        </IconCardTitle>
        <CardDescription>{t('intro')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!canWrite ? <p>{t('closed')}</p> : people.length === 0 ? <p>{t('nobody')}</p> : <NewTipDialog input={input} people={people} />}
        {tips.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-lg font-bold">{t('mine-title')}</h3>
            <ul className="flex flex-col gap-3">
              {tips.map((tip) => (
                <AuthoredTip key={tip.id} input={input} tip={tip} canEdit={canWrite} />
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
};
