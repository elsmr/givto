import { cn } from '@/lib/utils';
import { Gift } from 'lucide-react';
import { type Easing, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useState } from 'react';

type Frame = { transform?: string[]; opacity?: number[] };
type Still = { transform?: string; opacity?: number };

const CYCLE = 6.5;
const people = ['bg-coral', 'bg-yellow', 'bg-mint', 'bg-primary'];
const helpers = [
  { left: 40, note: { left: 60, top: 14 } },
  { left: 81, note: { left: 85, top: 28 } },
  { left: 122, note: { left: 110, top: 14 } },
];
const HELPER_TOP = 72;
const GIFT = { left: 77, top: 12 };
// Board to the target's hands, over the wall: x linear, y a parabola peaking just above the board.
const flight: [number, number][] = [
  [0, 0],
  [32.5, -8.75],
  [65, -10],
  [97.5, -3.75],
  [130, 10],
];
const landed = flight.at(-1)!;

const move = (x = 0, y = 0, scale = 1) => `translate(${x}px, ${y}px) scale(${scale})`;

const Face = ({ color, className }: { color: string; className?: string }) => (
  <div className={cn('absolute rounded-full border-2 border-outline shadow-sm', color, className)}>
    <span className="absolute top-[38%] left-[28%] size-1 rounded-full bg-outline" />
    <span className="absolute top-[38%] right-[28%] size-1 rounded-full bg-outline" />
  </div>
);

/**
 * Wordless loop showing how a conspiracy plays out; sits above the explanation in the kind's (?) popover.
 * Three people pin ideas to a board behind a wall, turn them into one gift and hand it over the wall to
 * the blindfolded fourth; the next loop blindfolds the next person. Reduced motion: the handed-over gift.
 * Only transform and opacity animate, so every part runs on the same WAAPI clock; a single WAAPI
 * easing would warp the whole cycle, so each segment gets its own.
 */
export const ConspiracyAnimation = () => {
  const reduced = useReducedMotion();
  const [turn, setTurn] = useState(0);

  const play = (frames: Frame, seconds: number[], still: Still, ease: Easing | Easing[] = 'easeInOut') =>
    reduced
      ? { initial: false as const, animate: still }
      : {
          initial: { transform: frames.transform?.[0], opacity: frames.opacity?.[0] },
          animate: frames,
          transition: {
            duration: CYCLE,
            times: seconds.map((s) => s / CYCLE),
            ease: Array.isArray(ease) ? ease : seconds.slice(1).map(() => ease),
          },
        };

  const target = people[turn % people.length];
  const others = people.filter((color) => color !== target);

  return (
    <div aria-hidden="true" className="relative h-28 w-full overflow-hidden border-2 border-outline bg-page">
      <div key={turn} className="absolute inset-y-0 left-1/2 w-64 -translate-x-1/2">
        <div className="absolute top-2 left-[50px] h-11 w-[90px] border-2 border-outline bg-surface shadow-sm" />

        {helpers.map(({ left, note }, i) => {
          const drop = 0.5 + i * 0.7;
          const fromX = left + 13 - (note.left + 10);
          const fromY = HELPER_TOP + 13 - (note.top + 8);
          const mergeX = GIFT.left + 18 - (note.left + 10);
          const mergeY = GIFT.top + 18 - (note.top + 8);
          return (
            <m.div
              key={`note-${i}`}
              className={cn('absolute h-4 w-5 border-2 border-outline', others[i])}
              style={{ left: note.left, top: note.top }}
              {...play(
                {
                  transform: [
                    move(fromX, fromY, 0.4),
                    move(fromX, fromY, 0.4),
                    move(),
                    move(),
                    move(mergeX, mergeY, 0),
                    move(mergeX, mergeY, 0),
                  ],
                  opacity: [0, 0, 1, 1, 0, 0],
                },
                [0, drop, drop + 0.5, 3.1, 3.5, CYCLE],
                { transform: move(), opacity: 1 },
              )}
            />
          );
        })}

        {helpers.map(({ left }, i) => {
          const drop = 0.5 + i * 0.7;
          return (
            <m.div
              key={`helper-${i}`}
              className="absolute size-[26px]"
              style={{ left, top: HELPER_TOP }}
              {...play(
                { transform: [0, 0, -6, 0, 0, -4, 0, 0].map((y) => move(0, y)) },
                [0, drop, drop + 0.15, drop + 0.3, 4.9, 5.05, 5.2, CYCLE],
                { transform: move() },
              )}
            >
              <Face color={others[i]} className="inset-0" />
            </m.div>
          );
        })}

        <div className="absolute inset-y-0 left-[164px] w-3 border-x-2 border-outline bg-primary-muted bg-[repeating-linear-gradient(to_bottom,var(--color-outline)_0_2px,transparent_2px_12px)]" />

        <m.div
          className="absolute top-[62px] left-[208px] size-[30px]"
          {...play({ transform: [0, 0, -8, 0, 0].map((y) => move(0, y)) }, [0, 4.9, 5.1, 5.35, CYCLE], { transform: move() })}
        >
          <Face color={target} className="inset-0 shadow-md" />
          <m.span
            className="absolute top-[30%] -right-1 -left-1 h-2 bg-outline"
            {...play(
              { transform: [0, 0, -10, -10, 0, 0].map((y) => move(0, y)), opacity: [1, 1, 0, 0, 0, 1] },
              [0, 4.9, 5.1, 6.0, 6.1, CYCLE],
              { transform: move(0, -10), opacity: 0 },
            )}
          />
        </m.div>

        <m.div
          className="absolute flex size-9 items-center justify-center border-2 border-outline bg-surface text-ink shadow-sm"
          style={{ left: GIFT.left, top: GIFT.top }}
          onAnimationComplete={reduced ? undefined : () => setTurn((current) => current + 1)}
          {...play(
            {
              transform: [
                move(0, 0, 0),
                move(0, 0, 0),
                move(0, 0, 1.2),
                ...flight.map(([x, y]) => move(x, y)),
                move(...landed),
                move(...landed, 0),
                move(...landed, 0),
              ],
              opacity: [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            },
            [0, 3.1, 3.5, 3.9, 4.15, 4.4, 4.65, 4.9, 5.7, 6.0, CYCLE],
            { transform: move(...landed), opacity: 1 },
            ['linear', 'easeOut', 'easeInOut', 'linear', 'linear', 'linear', 'linear', 'linear', 'easeIn', 'linear'],
          )}
        >
          <Gift className="size-5" strokeWidth={2.5} />
        </m.div>
      </div>
    </div>
  );
};
