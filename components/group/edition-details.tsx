import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { formatBudget } from '@/lib/format-budget';
import { formatLocalDate } from '@/lib/local-date';
import { isBeforeDraw } from '@/lib/schema/edition';
import { NotebookText } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { GroupEdition } from './group-data';

/** Gift day, the draw, deadlines, exchange mode, budget and notes (28, 51), always open (79). `children`: actions below. */
export const EditionDetails = ({ edition, children }: { edition: GroupEdition; children?: ReactNode }) => {
  const t = useTranslations('group.summary');
  const tOverview = useTranslations('group.overview');
  const format = useFormatter();
  const locale = useLocale();
  const { giftDay, budget, timeZone } = edition;
  const localDate = (date: string) => formatLocalDate(date, locale);
  const draw = !isBeforeDraw(edition)
    ? t('drawn')
    : edition.drawAt && t('draw-on', { date: format.dateTime(edition.drawAt, { dateStyle: 'full', timeZone }) });
  const posted = edition.exchangeMode !== 'inPerson';

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={NotebookText} tone="mint">
          {tOverview('details')}
        </IconCardTitle>
      </CardHeader>
      <CardContent className="@container flex flex-col gap-5">
        <dl className="grid gap-x-6 gap-y-3 @max-sm:gap-y-1 @max-sm:[&>dt:not(:first-child)]:mt-3 @sm:grid-cols-[auto_1fr]">
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
          {draw && (
            <>
              <dt className="font-semibold">{t('draw')}</dt>
              <dd>{draw}</dd>
            </>
          )}
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
          <dd>{budget ? formatBudget(budget, locale) : t('no-budget')}</dd>
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
