import { useTRPC } from '@/lib/client/trpc';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { useQuery } from '@tanstack/react-query';
import { Heart, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AvatarStack } from './avatar-stack';
import { GiftDayStat } from './gift-day-stat';
import { isBeforeDraw } from './edition-phase';
import type { GroupData } from './group-data';
import { RingGauge } from './ring-gauge';
import { StatCard } from '@/components/ui/stat-card';
import type { GroupTab } from './use-group-tab';

/** Gift day countdown, my wishes here and who's in (61); the last two open their tab. */
export const OverviewStats = ({ group, showTab }: { group: GroupData; showTab: (tab: GroupTab) => void }) => {
  const t = useTranslations('group.stats');
  const trpc = useTRPC();
  const wishes = useQuery(trpc.wish.groupView.queryOptions({ groupSlug: group.slug }));
  const { edition } = group;
  const people = edition ? group.members.filter((m) => edition.participantIds.includes(m.id)) : group.members.filter((m) => m.status === 'joined');
  const tooFew = Boolean(edition && isBeforeDraw(edition)) && people.length < MIN_PARTICIPANTS;
  const wishCount = wishes.data?.filter((wish) => !wish.hidden).length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
      {edition && <GiftDayStat edition={edition} />}
      <StatCard
        icon={Heart}
        tone="coral"
        title={t('wishes')}
        value={wishCount ?? '–'}
        unit={t('wishes-unit', { count: wishCount ?? 0 })}
        onClick={() => showTab('wishlist')}
      />
      <StatCard
        icon={Users}
        tone="primary-muted"
        title={t('people')}
        className="col-span-2 lg:col-span-1"
        visual={tooFew ? <RingGauge value={people.length} max={MIN_PARTICIPANTS} /> : <AvatarStack people={people} />}
        value={tooFew ? undefined : people.length}
        unit={tooFew ? t('needed', { count: MIN_PARTICIPANTS - people.length }) : t('people-in', { count: people.length })}
        onClick={() => showTab('people')}
      />
    </div>
  );
};
