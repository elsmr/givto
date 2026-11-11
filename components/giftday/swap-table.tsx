import { Button } from '@/components/ui/button';
import type { RouterOutputs } from '@/lib/client/trpc';
import { MAX_STEALS } from '@/lib/swap-turns';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, Hand, Snowflake } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type SwapTableData = NonNullable<RouterOutputs['giftday']['get']['swap']>;

type SwapTableProps = {
  swap: SwapTableData;
  /** On the presenter: a Steal (or, at the final steal, Swap) button on these gifts. */
  stealable?: number[];
  onSteal?: (giftNo: number) => void;
  busy?: boolean;
  large?: boolean;
  className?: string;
};

/** White elephant (89): who holds which gift and how often it was stolen; the third steal freezes it. */
export const SwapTable = ({ swap, stealable = [], onSteal, busy, large, className }: SwapTableProps) => {
  const t = useTranslations('giftday.swap');

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {swap.gifts.length > 0 && (
        <ul aria-label={t('table')} className={cn('gap-3', large ? 'flex flex-wrap justify-center' : 'grid grid-cols-1 xs:grid-cols-2')}>
          {swap.gifts.map((gift) => {
            const canSteal = onSteal && stealable.includes(gift.no);
            return (
              <li
                key={gift.no}
                className={cn('flex flex-col gap-1 bg-surface p-3 text-left text-ink bordered', large && 'w-60 p-4')}
              >
                <p className={cn('flex items-center justify-between gap-2 font-semibold', large && 'text-xl')}>
                  {t('gift', { no: gift.no })}
                  {gift.frozen && (
                    <span className="flex items-center gap-1 bg-primary-muted px-2 py-0.5 text-sm">
                      <Snowflake aria-hidden="true" className="size-4" />
                      {t('frozen')}
                    </span>
                  )}
                </p>
                {gift.label && <p className="break-words text-muted">{gift.label}</p>}
                <p className={cn('font-heading font-extrabold break-words', large ? 'text-3xl' : 'text-lg')}>{gift.holder.name}</p>
                <p className="flex items-center gap-1">
                  {Array.from({ length: MAX_STEALS }, (_, i) => (
                    <Hand key={i} aria-hidden="true" className={cn('size-4', i < gift.steals ? 'text-ink' : 'text-muted opacity-30')} />
                  ))}
                  <span className="sr-only">{t('steals', { count: gift.steals })}</span>
                </p>
                {canSteal && (
                  <Button size="sm" variant="neutral" disabled={busy} onClick={() => onSteal(gift.no)} aria-label={t(swap.final ? 'swap-label' : 'steal-label', { no: gift.no, name: gift.holder.name })} className="mt-1">
                    <ArrowLeftRight aria-hidden="true" />
                    {t(swap.final ? 'swap' : 'steal')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {swap.wrapped > 0 && <p className={cn('text-muted', large && 'text-xl')}>{t('wrapped', { count: swap.wrapped })}</p>}
    </div>
  );
};
