import { daysBetween, formatLocalDate, todayIn } from '@/lib/local-date';
import { CalendarDays } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { GroupEdition } from './group-data';
import { StatCard } from '@/components/ui/stat-card';

/** Days to gift day, with the date (28). */
export const GiftDayStat = ({ edition }: { edition: GroupEdition }) => {
  const t = useTranslations('group.stats');
  const locale = useLocale();
  const { giftDay, timeZone } = edition;
  if (!giftDay) return <StatCard icon={CalendarDays} tone="yellow" title={t('gift-day')} value="–" unit={t('no-gift-day')} />;

  const days = daysBetween(todayIn(timeZone), giftDay.date);
  const date = formatLocalDate(giftDay.date, locale, { day: 'numeric', month: 'short' });
  const word = (text: string) => <span className="text-base">{text}</span>;
  return (
    <StatCard
      icon={CalendarDays}
      tone="yellow"
      title={t('gift-day')}
      value={days > 0 ? days : word(t(days === 0 ? 'today' : 'over'))}
      unit={days > 0 ? t('days-to-go', { count: days, date }) : date}
    />
  );
};
