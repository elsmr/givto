import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import type { RouterOutputs } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type UnwrapOrder = NonNullable<RouterOutputs['giftday']['get']['unwrapOrder']>;

/** On gift day, for everyone's phone: who's unwrapping now, as the presenter steps (who's next stays a surprise). */
export const UnwrapNow = ({ order, className }: { order: UnwrapOrder; className?: string }) => {
  const t = useTranslations('giftday.order');

  if (order.finished) return <p className={cn('bg-mint p-3 font-semibold text-ink bordered', className)}>{t('finished')}</p>;
  return (
    <div aria-live="polite" className={cn('flex items-center gap-4 bg-yellow p-4 text-ink bordered shadow-md', className)}>
      {order.current && <LogoAnimation key={order.turn} variant="celebrate" className="size-12 shrink-0" />}
      <div className="flex min-w-0 flex-col gap-1">
        {order.current ? (
          <p className="text-lg">
            {t('now')}: <strong className="font-heading text-2xl break-words">{order.current.name}</strong>
          </p>
        ) : (
          <p className="text-lg font-semibold">{t('spinning')}</p>
        )}
      </div>
    </div>
  );
};
