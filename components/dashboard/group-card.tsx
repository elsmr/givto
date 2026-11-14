import { phaseLabel, phaseOf, statusTone } from '@/components/group/edition-phase';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDivider } from '@/components/ui/card';
import type { RouterOutputs } from '@/lib/client/trpc';
import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GiftDayCountdown } from './gift-day-label';

export type DashboardGroup = RouterOutputs['account']['groups'][number];

const StatusBadge = ({ group }: { group: DashboardGroup }) => {
  const t = useTranslations();
  if (group.archived) return <Badge>{t('dashboard.archived')}</Badge>;
  const { edition } = group;
  return (
    edition && (
      <Badge variant={statusTone[edition.status]}>{t(`group.phase.${phaseLabel(phaseOf(edition.status, edition.participantCount), edition.kind)}`)}</Badge>
    )
  );
};

export const GroupCard = ({ group }: { group: DashboardGroup }) => {
  const t = useTranslations('dashboard');
  const { edition } = group;

  return (
    <Card size="sm" className="relative h-full has-[a:hover]:bg-page">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-xl font-bold break-words">
            {/* The link covers the whole card: one big tap target. */}
            <Link href={`/g/${group.slug}`} className="text-ink no-underline after:absolute after:inset-0">
              {group.name}
            </Link>
          </h3>
          <StatusBadge group={group} />
        </div>
        <p className="text-muted">{edition?.title ?? t('no-edition')}</p>
      </CardContent>
      <CardDivider className="mt-auto" />
      <CardContent className="flex flex-wrap items-end justify-between gap-3">
        {edition && <GiftDayCountdown date={edition.giftDay} timeZone={edition.timeZone} />}
        <div className="flex flex-col items-end gap-1 text-right">
          {edition?.gifteeReady && (
            <Badge variant="mint">
              <Gift aria-hidden="true" />
              {t('giftee-ready')}
            </Badge>
          )}
          {group.role === 'organizer' && <p className="mono text-xs text-muted">{t('organizer')}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
