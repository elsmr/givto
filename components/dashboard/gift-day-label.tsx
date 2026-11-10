import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { daysUntil } from './days-until';

const GiftDayLabel = ({ date }: { date?: string }) => {
  const t = useTranslations('dashboard.gift-day');
  const format = useFormatter();
  return (
    <p className="flex items-center gap-2 font-semibold">
      <CalendarDays aria-hidden="true" className="size-5 shrink-0" />
      {date === undefined
        ? t('none')
        : t('past', { date: format.dateTime(new Date(`${date}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' }) })}
    </p>
  );
};

/** The days to gift day as a big number with a small label; the sentence when there's no countdown. */
export const GiftDayCountdown = ({ date, timeZone, size = 'md' }: { date?: string; timeZone: string; size?: 'md' | 'lg' }) => {
  const t = useTranslations('dashboard.countdown');
  const days = date === undefined ? undefined : daysUntil(date, timeZone);
  if (days === undefined || days < 0) return <GiftDayLabel date={date} />;

  return (
    <p className="flex flex-col">
      <span className={cn('font-heading leading-none font-extrabold tabular-nums', size === 'lg' ? 'text-6xl' : 'text-4xl')}>
        {days === 0 ? t('today') : days}
      </span>
      <span className="text-xs font-semibold text-muted">{days === 0 ? t('today-label') : t('days', { days })}</span>
    </p>
  );
};
