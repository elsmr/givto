import { champions } from '@/lib/guess-results';
import { Trophy } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useFormatter, useTranslations } from 'next-intl';
import { PresenterControls } from './presenter-controls';
import { GuessScoreboard } from '@/components/guess/guess-scoreboard';
import { canRevealIn, currentSanta, type PresenterOrder, type PresenterView } from './presenter-phase';
import { PresenterRevealSlide } from './presenter-reveal-slide';
import { PresenterTitleSlide } from './presenter-title-slide';
import { PresenterTurnSlide } from './presenter-turn-slide';
import { usePresenterActions } from './use-presenter-actions';
import { usePresenterKeys } from './use-presenter-keys';
import { WhoIsNextEndgame } from './who-is-next-endgame';
import { WhoIsNextReel } from './who-is-next-reel';

type PresenterStageProps = { groupSlug: string; editionNumber: number; view: PresenterView; order: PresenterOrder; skipSpin: boolean };

/** "Who's next" on a shared screen: spin, unwrap, next turn; arrows/space or the buttons. */
export const PresenterStage = ({ groupSlug, editionNumber, view, order, skipSpin }: PresenterStageProps) => {
  const t = useTranslations('giftday');
  const format = useFormatter();
  const actions = usePresenterActions({ groupSlug, editionNumber, view, order, skipSpin });
  const { phase } = actions;
  usePresenterKeys(actions);
  const rotation = order.people.filter((p) => !p.done).map((p) => p.name);
  const leaderboard = view.guessing?.leaderboard ?? [];
  const winners = champions(leaderboard).map((id) => leaderboard.find((entry) => entry.memberId === id)!.name);

  return (
    <div className="flex flex-1 flex-col">
      <div aria-live="polite" className="flex flex-1 items-center justify-center overflow-hidden px-6 py-10">
        {/* No initial={false}: it would stop every animation inside the first slide for as long as it's shown. */}
        <AnimatePresence mode="wait">
          <m.div
            key={`${phase}-${order.turn}-${phase === 'reveal' && actions.revealed}`}
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
                {rotation.length > 3 ? (
                  <WhoIsNextReel names={rotation} target={order.current?.name ?? ''} status={actions.spinStatus} onLanded={actions.onLanded} />
                ) : (
                  <WhoIsNextEndgame names={rotation} target={order.current?.name ?? ''} status={actions.spinStatus} onLanded={actions.onLanded} />
                )}
              </>
            )}
            {phase === 'turn' && <PresenterTurnSlide order={order} oneByOne={view.unwrapMode === 'oneByOne'} santa={currentSanta(order, view)} guessing={view.guessing} vote={view.vote} />}
            {phase === 'reveal' && <PresenterRevealSlide reveal={view.reveal} guessing={view.guessing} />}
            {phase === 'end' && (
              <>
                <PresenterTitleSlide title={t('present.end-title')} hint={t('present.end-hint')} />
                {winners.length > 0 && (
                  <p className="flex items-center gap-3 text-3xl font-bold sm:text-5xl">
                    <Trophy aria-hidden="true" className="size-8 sm:size-12" />
                    {t('present.champion', { count: winners.length, names: format.list(winners) })}
                  </p>
                )}
                {/* Without the big reveal, the Santas shown at the turns are the scoreboard (62). */}
                {!canRevealIn(view) && view.guessing && view.guessing.results.length > 0 && <GuessScoreboard guessing={view.guessing} large />}
              </>
            )}
          </m.div>
        </AnimatePresence>
      </div>
      <PresenterControls actions={actions} oneByOne={view.unwrapMode === 'oneByOne'} />
    </div>
  );
};
