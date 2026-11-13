import { DisclosureCard } from '@/components/ui/disclosure-card';
import { daysBetween, todayIn } from '@/lib/local-date';
import { History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GroupCard, type DashboardGroup } from './group-card';
import { TodoList } from './todo-list';
import { UpNextCard } from './up-next-card';

const isPast = (group: DashboardGroup) => group.archived || group.edition?.status === 'done';

const giftDayOrder = (group: DashboardGroup) =>
  group.edition?.giftDay ? daysBetween(todayIn(group.edition.timeZone), group.edition.giftDay) : Infinity;

// Editions brought over from the old app have a year but no gift day.
const pastOrder = (group: DashboardGroup) => group.edition?.giftDay ?? String(group.edition?.year ?? '');

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
  const [next, ...current] = groups.filter((group) => !isPast(group)).toSorted((a, b) => giftDayOrder(a) - giftDayOrder(b));
  const past = groups.filter(isPast).toSorted((a, b) => pastOrder(b).localeCompare(pastOrder(a)));

  return (
    <div className="flex flex-col gap-10">
      <TodoList groups={groups} />
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
