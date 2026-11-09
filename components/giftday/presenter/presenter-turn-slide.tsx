import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import { Confetti } from './confetti';
import type { PresenterOrder } from './presenter-phase';

type PresenterTurnSlideProps = { order: PresenterOrder; oneByOne: boolean };

/** Whose turn it is, big, with a burst of confetti. No Santas here. */
export const PresenterTurnSlide = ({ order, oneByOne }: PresenterTurnSlideProps) => {
  const t = useTranslations('giftday.present');
  const number = order.people.findIndex((p) => p.memberId === order.current?.memberId) + 1;

  return (
    <>
      <Confetti />
      <LogoAnimation variant="celebrate" className="size-24 sm:size-32" />
      <p className="text-2xl font-semibold sm:text-4xl">{oneByOne ? t('round', { round: order.round }) : t('next-up')}</p>
      <m.p
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="max-w-full bg-yellow px-8 py-6 font-heading text-[clamp(3rem,11vw,11rem)] leading-none font-extrabold break-words text-ink bordered shadow-brand"
      >
        {order.current?.name}
      </m.p>
      {!oneByOne && <p className="text-xl text-muted sm:text-2xl">{t('step', { current: number, total: order.people.length })}</p>}
    </>
  );
};
