import { daysBetween, todayIn } from '@/lib/local-date';
import { useTranslations } from 'next-intl';
import { GroupCard, type DashboardGroup } from './group-card';

const isPast = (group: DashboardGroup) => group.archived || group.edition?.status === 'done';

const giftDayOrder = (group: DashboardGroup) =>
  group.edition?.giftDay ? daysBetween(todayIn(group.edition.timeZone), group.edition.giftDay) : Infinity;

const Section = ({ id, title, groups }: { id: string; title: string; groups: DashboardGroup[] }) => (
  <section aria-labelledby={id} className="flex flex-col gap-4">
    <h2 id={id} className="text-2xl font-bold">
      {title}
    </h2>
    <ul className="grid gap-6 sm:grid-cols-2">
      {groups.map((group) => (
        <li key={group.slug}>
          <GroupCard group={group} />
        </li>
      ))}
    </ul>
  </section>
);

export const GroupList = ({ groups }: { groups: DashboardGroup[] }) => {
  const t = useTranslations('dashboard');
  const current = groups.filter((group) => !isPast(group)).toSorted((a, b) => giftDayOrder(a) - giftDayOrder(b));
  const past = groups.filter(isPast).toSorted((a, b) => giftDayOrder(b) - giftDayOrder(a));

  return (
    <div className="flex flex-col gap-10">
      {current.length > 0 && <Section id="groups-current" title={t('current')} groups={current} />}
      {past.length > 0 && <Section id="groups-past" title={t('past')} groups={past} />}
    </div>
  );
};
