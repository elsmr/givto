import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { daysBetween, todayIn } from '@/lib/local-date';
import { useFormatter, useTranslations } from 'next-intl';
import { formatBudget } from './format-budget';
import type { GroupEdition } from './group-data';

/** Gift day with countdown, exchange mode and budget (28, 51). */
export const EditionSummary = ({ edition }: { edition: GroupEdition }) => {
  const t = useTranslations('group.summary');
  const format = useFormatter();
  const { giftDay, budget } = edition;
  const days = giftDay ? daysBetween(todayIn(edition.timeZone), giftDay.date) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{days === null ? t('no-gift-day') : t('countdown', { when: days < 0 ? 'past' : days === 0 ? 'today' : 'future', days })}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
          {giftDay && (
            <>
              <dt className="font-semibold">{t('gift-day')}</dt>
              <dd>
                {format.dateTime(new Date(`${giftDay.date}T00:00:00Z`), { dateStyle: 'full', timeZone: 'UTC' })}
                {giftDay.time && ` · ${giftDay.time}`}
                {giftDay.place && ` · ${giftDay.place}`}
              </dd>
            </>
          )}
          <dt className="font-semibold">{t('exchange')}</dt>
          <dd>{t(`exchange-modes.${edition.exchangeMode}`)}</dd>
          <dt className="font-semibold">{t('budget')}</dt>
          <dd>{budget ? formatBudget(format, budget) : t('no-budget')}</dd>
        </dl>
      </CardContent>
    </Card>
  );
};
