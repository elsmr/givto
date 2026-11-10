import { DisclosureCard } from '@/components/ui/disclosure-card';
import { StatCard } from '@/components/ui/stat-card';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Heart, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { daysUntil } from './days-until';
import { GroupCard, type DashboardGroup } from './group-card';
import { TodoList } from './todo-list';
import { UpNextCard } from './up-next-card';

const isPast = (group: DashboardGroup) => group.archived || group.edition?.status === 'done';

const giftDayOrder = (group: DashboardGroup) =>
  group.edition?.giftDay ? daysUntil(group.edition.giftDay, group.edition.timeZone) : Infinity;

const GroupGrid = ({ groups }: { groups: DashboardGroup[] }) => (
  <ul className="grid gap-6 sm:grid-cols-2">
    {groups.map((group) => (
      <li key={group.slug}>
        <GroupCard group={group} />
      </li>
    ))}
  </ul>
);

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section aria-labelledby={id} className="flex flex-col gap-4">
    <h2 id={id} className="text-2xl font-bold">
      {title}
    </h2>
    {children}
  </section>
);

/** Signed-in home: what needs me, the next gift day, then the rest of my groups. */
export const Dashboard = ({ groups }: { groups: DashboardGroup[] }) => {
  const t = useTranslations('dashboard');
  const wishes = useQuery(useTRPC().wish.list.queryOptions());
  const [next, ...current] = groups.filter((group) => !isPast(group)).toSorted((a, b) => giftDayOrder(a) - giftDayOrder(b));
  const past = groups.filter(isPast).toSorted((a, b) => giftDayOrder(b) - giftDayOrder(a));

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_16rem] lg:items-start">
        <TodoList groups={groups} />
        <StatCard
          icon={Heart}
          tone="coral"
          title={t('wishlist-stat.title')}
          value={wishes.data?.length ?? '–'}
          unit={t('wishlist-stat.unit', { count: wishes.data?.length ?? 0 })}
          href="/wishlist"
        />
      </div>
      {next && (
        <Section id="up-next" title={t('up-next')}>
          <UpNextCard group={next} />
        </Section>
      )}
      {current.length > 0 && (
        <Section id="your-groups" title={t('your-groups')}>
          <GroupGrid groups={current} />
        </Section>
      )}
      {past.length > 0 && (
        <DisclosureCard title={`${t('past')} (${past.length})`} icon={History} tone="primary-muted">
          <GroupGrid groups={past} />
        </DisclosureCard>
      )}
    </div>
  );
};
