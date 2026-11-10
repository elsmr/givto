import { daysBetween, todayIn } from '@/lib/local-date';
import { CalendarDays } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

export const GiftDayLabel = ({ date, timeZone }: { date?: string; timeZone: string }) => {
  const t = useTranslations('dashboard');
  const format = useFormatter();
  const days = date === undefined ? undefined : daysBetween(todayIn(timeZone), date);
  const text =
    date === undefined || days === undefined
      ? t('gift-day.none')
      : days > 0
        ? t('gift-day.in-days', { days })
        : days === 0
          ? t('gift-day.today')
          : t('gift-day.past', {
              date: format.dateTime(new Date(`${date}T12:00:00Z`), { dateStyle: 'medium', timeZone: 'UTC' }),
            });

  return (
    <p className="flex items-center gap-2 font-semibold">
      <CalendarDays aria-hidden="true" className="size-5 shrink-0" />
      {text}
    </p>
  );
};
