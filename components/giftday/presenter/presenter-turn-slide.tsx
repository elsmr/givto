import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { cn } from '@/lib/utils';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import { SwapTable } from '../swap-table';
import { Confetti } from './confetti';
import { currentGiftCount, type PresenterGuessResult, type PresenterOrder, type PresenterView } from './presenter-phase';
import { PresenterSanta } from './presenter-santa';

type PresenterTurnSlideProps = {
  order: PresenterOrder;
  oneByOne: boolean;
  santa: PresenterGuessResult | null;
  guessing: PresenterView['guessing'];
  /** White elephant (89): the table, with what the current person may steal. */
  swap: PresenterView['swap'];
  onSteal: (giftNo: number) => void;
  busy: boolean;
  /** A conspiracy (90): everyone's gift is from all the others. */
  fromAll: boolean;
};

const Name = ({ name, small }: { name?: string; small?: boolean }) => (
  <m.p
    initial={{ scale: 0.6, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    className={cn(
      'max-w-full bg-yellow font-heading leading-none font-extrabold wrap-anywhere text-ink bordered shadow-brand',
      // Bounded by the height too, so a long name still leaves room for the rest of the slide on a laptop screen.
      small ? 'px-6 py-3 text-[clamp(2.5rem,min(7vw,8dvh),7rem)]' : 'px-8 py-6 text-[clamp(3rem,min(11vw,16dvh),11rem)]'
    )}
  >
    {name}
  </m.p>
);

/**
 * Whose turn it is, big, with a burst of confetti; "gift 2 of 3" when their Santa marked their gifts (63).
 * Their Santa only with Guess your Santa (62) on, once shown after they've unwrapped; until then everyone can still
 * guess on their phone (94). White elephant (89): why they're up (their turn, stolen
 * from, the final steal) and the table to steal from.
 */
export const PresenterTurnSlide = ({ order, oneByOne, santa, guessing, swap, onSteal, busy, fromAll }: PresenterTurnSlideProps) => {
  const t = useTranslations('giftday.present');
  const tGuess = useTranslations('guess.present');
  const tSwap = useTranslations('giftday.swap');
  const number = order.people.findIndex((p) => p.memberId === order.current?.memberId) + 1;
  const gifts = currentGiftCount(order);
  // Nobody left to spin between: no reel before this turn.
  const lastOne = order.people.filter((p) => !p.done).length === 1;

  if (swap) {
    return (
      <>
        <Confetti />
        <p className="text-2xl font-semibold sm:text-4xl">
          {swap.final ? tSwap('final') : swap.robbed ? tSwap('robbed') : lastOne ? t('last-one') : tSwap('up')}
        </p>
        <Name name={order.current?.name} small />
        <p className="text-xl text-muted sm:text-2xl">{tSwap(swap.final ? (swap.stealable.length > 0 ? 'hint-final' : 'hint-final-none') : swap.stealable.length > 0 ? 'hint' : 'hint-open')}</p>
        <SwapTable swap={swap} stealable={swap.stealable} onSteal={onSteal} busy={busy} large />
      </>
    );
  }
  return (
    <>
      <Confetti />
      {/* Their Santa needs the room. */}
      {!santa && <LogoAnimation variant="celebrate" className="size-24 sm:size-32" />}
      {lastOne && oneByOne && <p className="text-2xl font-semibold sm:text-4xl">{t('last-one')}</p>}
      <p className="text-2xl font-semibold sm:text-4xl">{oneByOne ? t('round', { round: order.round }) : t(lastOne ? 'last-one' : 'next-up')}</p>
      <Name name={order.current?.name} small={Boolean(santa)} />
      {fromAll && <p className="text-3xl font-bold sm:text-5xl">{t('from-all')}</p>}
      {oneByOne && gifts !== null && <p className="text-2xl font-semibold sm:text-4xl">{t('gift-of', { current: order.currentGift, total: gifts })}</p>}
      {!oneByOne && (
        <p className="text-xl text-muted sm:text-2xl">
          {t('step', { current: number, total: order.people.length })}
          {gifts !== null && ` · ${t('gifts', { count: gifts })}`}
        </p>
      )}
      {order.santaToShow && (
        <m.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-muted px-6 py-3 text-2xl font-semibold text-ink bordered shadow-md sm:text-4xl dark:border-control"
        >
          {tGuess('on-phones')}
        </m.p>
      )}
      {santa && <PresenterSanta result={santa} leaderboard={guessing?.leaderboard ?? []} />}
    </>
  );
};
