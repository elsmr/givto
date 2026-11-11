import { GuessVerdict } from '@/components/guess/guess-verdict';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import type { RouterOutputs } from '@/lib/client/trpc';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SwapTable } from './swap-table';

type GiftDay = RouterOutputs['giftday']['get'];
type UnwrapNowProps = { order: NonNullable<GiftDay['unwrapOrder']>; guessing?: GiftDay['guessing']; swap?: GiftDay['swap']; className?: string };

const name = (chunks: ReactNode) => <strong>{chunks}</strong>;

/**
 * On gift day, for everyone's phone: who's unwrapping now, as the presenter steps (who's next stays a
 * surprise); with Guess your Santa (62), their Santa and guess once the presenter showed them. White elephant (89): the
 * table, read-only.
 */
export const UnwrapNow = ({ order, guessing, swap, className }: UnwrapNowProps) => {
  const t = useTranslations('giftday.order');
  const tGuess = useTranslations('guess');
  const tSwap = useTranslations('giftday.swap');
  const santa = guessing?.results.find((result) => result.memberId === order.current?.memberId);
  const table = swap && <SwapTable swap={swap} />;

  if (order.finished) {
    return (
      <>
        <p className={cn('bg-mint p-3 font-semibold text-ink bordered', className)}>{t('finished')}</p>
        {table}
      </>
    );
  }
  return (
    <>
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
          {order.current && (swap?.robbed || swap?.final) && <p>{tSwap(swap.final ? 'now-final' : 'now-robbed')}</p>}
          {santa && (
            <p className="flex flex-wrap items-center gap-2">
              <span>{tGuess.rich('present.from', { santa: santa.santa, name })}</span>
              <span>·</span>
              {santa.guess ? (
                <>
                  <span>{tGuess.rich('result.guessed', { guess: santa.guess, name })}</span>
                  <GuessVerdict right={santa.right} />
                </>
              ) : (
                <span>{tGuess('result.no-guess')}</span>
              )}
            </p>
          )}
        </div>
      </div>
      {table}
    </>
  );
};
