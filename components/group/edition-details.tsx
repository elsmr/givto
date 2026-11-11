import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { formatBudget } from '@/lib/format-budget';
import { countdown, daysBetween, formatLocalDate, todayIn } from '@/lib/local-date';
import { drawsNames, isBeforeDraw } from '@/lib/schema/edition';
import { CalendarDays, Gift, ListChecks, Mailbox, NotebookText, Shuffle, Video, Wallet, type LucideIcon } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { GroupEdition } from './group-data';

const Fact = ({ icon: Icon, children, className }: { icon: LucideIcon; children: ReactNode; className?: string }) => (
  <li className="flex items-start gap-3">
    <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted" />
    <span className={className}>{children}</span>
  </li>
);

/**
 * Gift day with a countdown and its call link (87), then the draw, deadlines, exchange mode, budget and notes (28, 51)
 * as icon rows that read without labels. `children`: actions under gift day.
 */
export const EditionDetails = ({ edition, children }: { edition: GroupEdition; children?: ReactNode }) => {
  const t = useTranslations('group.summary');
  const format = useFormatter();
  const locale = useLocale();
  const { giftDay, budget, timeZone } = edition;
  const localDate = (date: string) => formatLocalDate(date, locale);
  const draw = !drawsNames(edition) ? null : !isBeforeDraw(edition)
    ? t('drawn')
    : edition.drawAt && t('draw-on', { date: format.dateTime(edition.drawAt, { dateStyle: 'full', timeZone }) });
  const posted = edition.exchangeMode !== 'inPerson';
  const when = giftDay && countdown(daysBetween(todayIn(timeZone), giftDay.date));

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={CalendarDays} tone="yellow">
          {t('gift-day')}
        </IconCardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {giftDay && when ? (
          <div className="flex flex-col gap-1">
            <p className="font-heading text-3xl leading-tight font-extrabold first-letter:uppercase">
              {new Intl.RelativeTimeFormat(locale, { numeric: when.unit === 'day' ? 'auto' : 'always' }).format(when.value, when.unit)}
            </p>
            <p>
              {localDate(giftDay.date)}
              {giftDay.time && ` · ${giftDay.time}`}
              {giftDay.place && ` · ${giftDay.place}`}
            </p>
            {giftDay.callUrl && (
              <a
                href={giftDay.callUrl}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="flex items-center gap-2 break-all underline"
              >
                <Video aria-hidden="true" className="size-4 shrink-0" />
                {giftDay.callUrl}
              </a>
            )}
          </div>
        ) : (
          <p className="text-muted">{t('no-gift-day')}</p>
        )}
        {children}
        <ul className="flex flex-col gap-3 border-t-2 border-dashed border-outline pt-5">
          {draw && <Fact icon={Shuffle}>{draw}</Fact>}
          {edition.wishlistBy && <Fact icon={ListChecks}>{t('wishlist-by', { date: localDate(edition.wishlistBy) })}</Fact>}
          <Fact icon={Gift}>{t(`exchange-modes.${edition.exchangeMode}`)}</Fact>
          {posted && edition.postBy && <Fact icon={Mailbox}>{t('post-by', { date: localDate(edition.postBy) })}</Fact>}
          <Fact icon={Wallet}>{budget ? t('budget', { budget: formatBudget(budget, locale) }) : t('no-budget')}</Fact>
          {edition.notes && (
            <Fact icon={NotebookText} className="whitespace-pre-line break-words">
              {edition.notes}
            </Fact>
          )}
        </ul>
      </CardContent>
    </Card>
  );
};
