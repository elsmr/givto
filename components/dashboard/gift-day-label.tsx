import { countdown, formatLocalDate } from '@/lib/local-date';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { daysUntil } from './days-until';

const GiftDayLabel = ({ date }: { date?: string }) => {
  const t = useTranslations('dashboard.gift-day');
  const locale = useLocale();
  return (
    <p className="mono flex items-center gap-2 font-semibold">
      <CalendarDays aria-hidden="true" className="size-5 shrink-0" />
      {date === undefined
        ? t('none')
        : t('past', { date: formatLocalDate(date, locale, { dateStyle: 'medium' }) })}
    </p>
  );
};

/** The time to gift day as a big number with a small label (2 / months to gift day); the sentence when there's no countdown. */
export const GiftDayCountdown = ({ date, timeZone, size = 'md' }: { date?: string; timeZone: string; size?: 'md' | 'lg' }) => {
  const t = useTranslations('dashboard.countdown');
  const days = date === undefined ? undefined : daysUntil(date, timeZone);
  if (days === undefined || days < 0) return <GiftDayLabel date={date} />;
  const when = countdown(days);

  return (
    <p className="flex flex-col">
      <span className={cn('mono font-heading leading-none font-extrabold tabular-nums', size === 'lg' ? 'text-6xl' : 'text-4xl')}>
        {days === 0 ? t('today') : when.value}
      </span>
      <span className="mono text-xs font-semibold text-muted">{days === 0 ? t('today-label') : t('left', { count: when.value, unit: when.unit })}</span>
    </p>
  );
};
