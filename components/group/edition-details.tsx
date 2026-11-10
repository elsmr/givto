import { Card, CardContent } from '@/components/ui/card';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { formatBudget } from './format-budget';
import type { GroupEdition } from './group-data';

/** Gift day, the draw, deadlines, exchange mode, budget and notes (28, 51). `children`: actions below. */
export const EditionDetails = ({ edition, children }: { edition: GroupEdition; children?: ReactNode }) => {
  const t = useTranslations('group.summary');
  const format = useFormatter();
  const { giftDay, budget, timeZone } = edition;
  // Local dates have no time zone: format them as UTC so they never shift a day.
  const localDate = (date: string) => format.dateTime(new Date(`${date}T00:00:00Z`), { dateStyle: 'full', timeZone: 'UTC' });
  const beforeDraw = edition.status === 'draft' || edition.status === 'open';
  const draw = !beforeDraw
    ? t('drawn')
    : edition.drawAt
      ? t('draw-on', { date: format.dateTime(edition.drawAt, { dateStyle: 'full', timeZone }) })
      : t('draw-manual');
  const posted = edition.exchangeMode !== 'inPerson';

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
          {giftDay && (
            <>
              <dt className="font-semibold">{t('gift-day')}</dt>
              <dd>
                {localDate(giftDay.date)}
                {giftDay.time && ` · ${giftDay.time}`}
                {giftDay.place && ` · ${giftDay.place}`}
              </dd>
            </>
          )}
          <dt className="font-semibold">{t('draw')}</dt>
          <dd>{draw}</dd>
          {edition.wishlistBy && (
            <>
              <dt className="font-semibold">{t('wishlist-by')}</dt>
              <dd>{localDate(edition.wishlistBy)}</dd>
            </>
          )}
          <dt className="font-semibold">{t('exchange')}</dt>
          <dd>{t(`exchange-modes.${edition.exchangeMode}`)}</dd>
          {posted && edition.postBy && (
            <>
              <dt className="font-semibold">{t('post-by')}</dt>
              <dd>{localDate(edition.postBy)}</dd>
            </>
          )}
          <dt className="font-semibold">{t('budget')}</dt>
          <dd>{budget ? formatBudget(format, budget) : t('no-budget')}</dd>
          {edition.notes && (
            <>
              <dt className="font-semibold">{t('notes')}</dt>
              <dd className="whitespace-pre-line break-words">{edition.notes}</dd>
            </>
          )}
        </dl>
        {children}
      </CardContent>
    </Card>
  );
};
