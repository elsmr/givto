import { StillShoppingStat } from '@/components/gift/still-shopping-stat';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Heart, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AvatarStack } from './avatar-stack';
import { GiftDayStat } from './gift-day-stat';
import type { GroupData } from './group-data';
import { StatCard } from '@/components/ui/stat-card';
import type { GroupTab } from './use-group-tab';

/** Gift day countdown, my wishes here and who's in (61); the last two open their tab. Organizers: who's still shopping (63). */
export const OverviewStats = ({ group, showTab }: { group: GroupData; showTab: (tab: GroupTab) => void }) => {
  const t = useTranslations('group.stats');
  const trpc = useTRPC();
  const wishes = useQuery(trpc.wish.groupView.queryOptions({ groupSlug: group.slug }));
  const { edition } = group;
  const people = edition ? group.members.filter((m) => edition.participantIds.includes(m.id)) : group.members.filter((m) => m.status === 'joined');
  const wishCount = wishes.data?.filter((wish) => wish.shown).length;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
      {edition && <GiftDayStat edition={edition} />}
      <StatCard
        icon={Heart}
        tone="coral"
        title={t('wishes')}
        value={wishCount ?? '–'}
        onClick={() => showTab('wishlist')}
      />
      <StatCard
        icon={Users}
        tone="primary-muted"
        title={t('people')}
        className="col-span-2 lg:col-span-1"
        visual={<AvatarStack people={people} />}
        value={people.length}
        onClick={() => showTab('people')}
      />
      {edition?.status === 'drawn' && group.organizer && edition.isCurrent && (
        <StillShoppingStat groupSlug={group.slug} editionNumber={edition.number} className="col-span-2 lg:col-span-1" />
      )}
    </div>
  );
};
