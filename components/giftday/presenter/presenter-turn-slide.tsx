import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import { VoteTally } from '../live-vote';
import { Confetti } from './confetti';
import { currentGiftCount, type PresenterGuessResult, type PresenterOrder, type PresenterView } from './presenter-phase';
import { PresenterSanta } from './presenter-santa';

type PresenterTurnSlideProps = {
  order: PresenterOrder;
  oneByOne: boolean;
  santa: PresenterGuessResult | null;
  guessing: PresenterView['guessing'];
  vote: PresenterView['vote'];
  /** A conspiracy (90): everyone's gift is from all the others. */
  fromAll: boolean;
};

/**
 * Whose turn it is, big, with a burst of confetti; "gift 2 of 3" when their Santa marked their gifts (63).
 * Their Santa only with Guess your Santa (62) on, once shown after they've unwrapped; before it, the room's
 * vote (83): "vote on your phones" while open, then the tally.
 */
export const PresenterTurnSlide = ({ order, oneByOne, santa, guessing, vote, fromAll }: PresenterTurnSlideProps) => {
  const t = useTranslations('giftday.present');
  const tVote = useTranslations('guess.vote');
  const number = order.people.findIndex((p) => p.memberId === order.current?.memberId) + 1;
  const gifts = currentGiftCount(order);
  // Nobody left to spin between: no reel before this turn.
  const lastOne = order.people.filter((p) => !p.done).length === 1;

  return (
    <>
      <Confetti />
      <LogoAnimation variant="celebrate" className="size-24 sm:size-32" />
      {lastOne && oneByOne && <p className="text-2xl font-semibold sm:text-4xl">{t('last-one')}</p>}
      <p className="text-2xl font-semibold sm:text-4xl">{oneByOne ? t('round', { round: order.round }) : t(lastOne ? 'last-one' : 'next-up')}</p>
      <m.p
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="max-w-full bg-yellow px-8 py-6 font-heading text-[clamp(3rem,11vw,11rem)] leading-none font-extrabold break-words text-ink bordered shadow-brand"
      >
        {order.current?.name}
      </m.p>
      {fromAll && <p className="text-3xl font-bold sm:text-5xl">{t('from-all')}</p>}
      {oneByOne && gifts !== null && <p className="text-2xl font-semibold sm:text-4xl">{t('gift-of', { current: order.currentGift, total: gifts })}</p>}
      {!oneByOne && (
        <p className="text-xl text-muted sm:text-2xl">
          {t('step', { current: number, total: order.people.length })}
          {gifts !== null && ` · ${t('gifts', { count: gifts })}`}
        </p>
      )}
      {vote?.open && (
        <m.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-muted px-6 py-3 text-2xl font-semibold text-ink bordered shadow-md sm:text-4xl dark:border-control"
        >
          {tVote('on-phones')}
        </m.p>
      )}
      {vote?.tally && (
        <m.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <VoteTally tally={vote.tally} large />
        </m.div>
      )}
      {santa && <PresenterSanta result={santa} leaderboard={guessing?.leaderboard ?? []} />}
    </>
  );
};
