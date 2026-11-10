import { IconCardTitle } from '@/components/group/icon-card-title';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { PartyPopper } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ReceivedButton } from './received-button';

/** After gift day (31, 38): "How did it go?" and marking my wishes received, so nobody buys them again. */
export const HowDidItGoCard = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('giftday.after');
  const trpc = useTRPC();
  const view = useQuery(trpc.wish.groupView.queryOptions({ groupSlug }));
  const wishes = view.data?.filter((wish) => !wish.hidden) ?? [];

  return (
    <Card className="bg-mint">
      <CardHeader>
        <IconCardTitle icon={PartyPopper} tone="yellow">
          {t('title')}
        </IconCardTitle>
        <CardDescription className="text-ink">{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {view.isPending ? (
          <Skeleton className="h-16" />
        ) : wishes.length === 0 ? (
          <p>{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {wishes.map((wish) => (
              <li key={wish.id} className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 text-ink bordered">
                <span className="min-w-0 font-semibold break-words">{wish.title}</span>
                <ReceivedButton wishId={wish.id} title={wish.title} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
