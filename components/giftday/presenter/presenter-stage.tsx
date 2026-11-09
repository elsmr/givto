import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PresenterControls } from './presenter-controls';
import type { PresenterOrder, PresenterView } from './presenter-phase';
import { PresenterRevealSlide } from './presenter-reveal-slide';
import { PresenterTitleSlide } from './presenter-title-slide';
import { PresenterTurnSlide } from './presenter-turn-slide';
import { usePresenterActions } from './use-presenter-actions';
import { usePresenterKeys } from './use-presenter-keys';
import { WhoIsNextReel } from './who-is-next-reel';

type PresenterStageProps = { groupSlug: string; editionNumber: number; view: PresenterView; order: PresenterOrder };

/** "Who's next" on a shared screen: spin, unwrap, next turn; arrows/space or the buttons. */
export const PresenterStage = ({ groupSlug, editionNumber, view, order }: PresenterStageProps) => {
  const t = useTranslations('giftday');
  const [skipSpin, setSkipSpin] = useState(false);
  const actions = usePresenterActions({ groupSlug, editionNumber, view, order, skipSpin });
  const { phase } = actions;
  usePresenterKeys(actions);
  const rotation = order.people.filter((p) => !p.done).map((p) => p.name);

  return (
    <div className="flex flex-1 flex-col">
      <div aria-live="polite" className="flex flex-1 items-center justify-center overflow-hidden px-6 py-10">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={`${phase}-${order.turn}`}
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -48 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex w-full max-w-7xl flex-col items-center gap-8 text-center"
          >
            {phase === 'intro' && (
              <PresenterTitleSlide title={view.status === 'drawn' ? view.title : t('hero.title')} hint={t('present.intro-hint')} />
            )}
            {phase === 'spin' && (
              <>
                <h2 className="text-5xl font-extrabold sm:text-7xl">{t('present.whos-next')}</h2>
                <WhoIsNextReel names={rotation} target={order.current?.name ?? ''} status={actions.spinStatus} onLanded={actions.onLanded} />
              </>
            )}
            {phase === 'turn' && <PresenterTurnSlide order={order} oneByOne={view.unwrapMode === 'oneByOne'} />}
            {phase === 'reveal' && <PresenterRevealSlide reveal={view.reveal} />}
            {phase === 'end' && <PresenterTitleSlide title={t('present.end-title')} hint={t('present.end-hint')} />}
          </m.div>
        </AnimatePresence>
      </div>
      <PresenterControls actions={actions} oneByOne={view.unwrapMode === 'oneByOne'} skipSpin={skipSpin} onSkipSpinChange={setSkipSpin} />
    </div>
  );
};
