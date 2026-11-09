import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { RouterOutputs } from '@/lib/client/trpc';
import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GiftDayLabel } from './gift-day-label';

export type DashboardGroup = RouterOutputs['account']['groups'][number];

const statusVariant = {
  draft: 'default',
  open: 'primary-muted',
  drawn: 'yellow',
  giftday: 'coral',
  done: 'default',
} as const;

export const GroupCard = ({ group }: { group: DashboardGroup }) => {
  const t = useTranslations('dashboard');
  const { edition } = group;

  return (
    <Card size="sm" className="relative h-full px-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-xl font-bold break-words">
          {/* The link covers the whole card: one big tap target. */}
          <Link href={`/g/${group.slug}`} className="text-ink no-underline after:absolute after:inset-0">
            {group.name}
          </Link>
        </h3>
        {group.archived ? (
          <Badge>{t('status.archived')}</Badge>
        ) : (
          edition && <Badge variant={statusVariant[edition.status]}>{t(`status.${edition.status}`)}</Badge>
        )}
      </div>
      <p className="text-muted">{edition?.title ?? t('no-edition')}</p>
      {edition && <GiftDayLabel date={edition.giftDay} timeZone={edition.timeZone} />}
      {edition?.gifteeReady && (
        <Badge variant="mint" className="text-sm">
          <Gift aria-hidden="true" className="size-4!" />
          {t('giftee-ready')}
        </Badge>
      )}
      {group.role === 'organizer' && <p className="text-sm text-muted">{t('organizer')}</p>}
    </Card>
  );
};
