import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNow } from '@/lib/client/use-now';
import { clock, countdownTo, daysBetween, formatLocalDate, holidayOn, todayIn } from '@/lib/local-date';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

/** A gift day for people: on a popular one its name ("Christmas Eve"), with the full date and time on hover or tap; else the date. */
export const GiftDate = ({ date, time, dateStyle = 'full' }: { date: string; time?: string; dateStyle?: 'full' | 'medium' }) => {
  const t = useTranslations('ui.holidays');
  const locale = useLocale();
  const holiday = holidayOn(date);
  if (!holiday) return formatLocalDate(date, locale, { dateStyle });

  // `relative`: above a card's full-size link overlay, so it still gets the hover.
  return (
    <Popover>
      <PopoverTrigger openOnHover delay={150} className="relative cursor-help underline decoration-dotted underline-offset-4">
        {t(holiday)}
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-72 gap-0 p-3 text-sm font-normal">
        {formatLocalDate(date, locale)}
        {time && ` · ${time}`}
      </PopoverContent>
    </Popover>
  );
};

const GiftDayLabel = ({ date, time }: { date?: string; time?: string }) => {
  const t = useTranslations('dashboard.gift-day');
  return (
    <p className="mono flex items-center gap-2 font-semibold">
      <CalendarDays aria-hidden="true" className="size-5 shrink-0" />
      <span>{date === undefined ? t('none') : t.rich('past', { date: () => <GiftDate date={date} time={time} dateStyle="medium" /> })}</span>
    </p>
  );
};

type GiftDayCountdownProps = { date?: string; time?: string; timeZone: string; size?: 'md' | 'lg' };

/**
 * The time to gift day as a big number with a small label (2 / months to gift day); with a time, hours on the last day
 * and a ticking clock in the last hour. The sentence when there's no countdown.
 */
export const GiftDayCountdown = ({ date, time, timeZone, size = 'md' }: GiftDayCountdownProps) => {
  const t = useTranslations('dashboard.countdown');
  const days = date === undefined ? undefined : daysBetween(todayIn(timeZone), date);
  const now = useNow(Boolean(time) && (days === 0 || days === 1));
  if (date === undefined || days === undefined || days < 0) return <GiftDayLabel date={date} time={time} />;
  const when = countdownTo(date, time, timeZone, now);
  const today = when.unit === 'day' && when.value === 0;
  const live = when.unit === 'second';

  return (
    <p className="flex flex-col">
      <span className={cn('mono font-heading leading-none font-extrabold tabular-nums', size === 'lg' ? 'text-6xl' : 'text-4xl')}>
        {today ? t('today') : live ? clock(when.value) : when.value}
      </span>
      <span className="mono text-xs font-semibold text-muted">
        {today ? t('today-label') : live ? t('live') : t('left', { count: when.value, unit: when.unit })}
        {holidayOn(date) && (
          <>
            {' · '}
            <GiftDate date={date} time={time} />
          </>
        )}
      </span>
    </p>
  );
};
