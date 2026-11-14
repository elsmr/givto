import { shuffle } from '@/lib/draw';
import { cn } from '@/lib/utils';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useRef, useState } from 'react';

export type SpinStatus = 'idle' | 'spinning' | 'skipped';

/** Long enough to feel like a wheel however few names there are. */
const MIN_ROWS = 40;
/** Seconds: slowing down onto the target, then a little past it and back, like a wheel clicking into place. */
const SLOW_SECONDS = 4.8;
const PAST_SECONDS = 0.3;
const BACK_SECONDS = 0.35;
const SPIN_SECONDS = SLOW_SECONDS + PAST_SECONDS + BACK_SECONDS;
const OVERSHOOT_ROWS = 0.12;
/**
 * Fast at first, then a long slow tail where the last few names tick by one by one. A cubic ease-out
 * cut at 80%: it reaches the target still moving (a click into place), not crawling to a stop.
 */
const slowDown = (t: number) => (1 - (1 - 0.8 * t) ** 3) / (1 - 0.2 ** 3);
const box =
  'h-[1.3em] min-w-[min(80vw,12em)] overflow-hidden bg-surface px-8 text-center font-heading text-[clamp(3rem,9vw,9rem)] leading-[1.3em] font-extrabold text-ink bordered shadow-lg dark:border-control dark:shadow-brand';

const shuffled = (items: string[]) => shuffle(items, (n) => Math.floor(Math.random() * n));

/**
 * Laps of everyone, each in a new order, then the others once more and `target`; never one name
 * twice in a row. One more name after the target shows when the reel drifts past it.
 */
const reelStrip = (names: string[], target: string) => {
  const others = names.filter((name) => name !== target);
  const rows: string[] = [];
  const lap = (lapNames: string[]) => {
    const order = shuffled(lapNames);
    rows.push(...(order.length > 1 && order[0] === rows.at(-1) ? [...order.slice(1), order[0]] : order));
  };
  while (names.length > 0 && rows.length + others.length + 1 < MIN_ROWS) lap(names);
  lap(others);
  return [...rows, target, shuffled(others)[0] ?? target];
};

type WhoIsNextReelProps = { names: string[]; target: string; status: SpinStatus; onLanded: () => void; className?: string };

/**
 * "Who's next?" with 4+ people left: the names spin by like a roulette wheel and slow down onto
 * `target`, already decided (by the server on gift day, 32; by the name picker, 70). Skipped or reduced
 * motion: a quick fade to the name. The caller announces the name, so the reel stays aria-hidden.
 */
export const WhoIsNextReel = ({ names, target, status, onLanded, className }: WhoIsNextReelProps) => {
  const reduced = useReducedMotion();
  // One strip per turn (the stage remounts the reel for each): a re-render mid-spin must not reshuffle it.
  const [strip] = useState(() => reelStrip(names, target));
  const quick = status === 'skipped' || (status === 'spinning' && reduced);
  const frame = cn(box, className);
  const landed = useRef(onLanded);
  useEffect(() => {
    landed.current = onLanded;
  });

  useEffect(() => {
    if (!quick) return;
    const timer = setTimeout(() => landed.current(), 400);
    return () => clearTimeout(timer);
  }, [quick]);

  if (status === 'idle') return <p className={frame}>?</p>;
  if (quick) {
    return (
      <div className={frame} aria-hidden="true">
        <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
          {target}
        </m.p>
      </div>
    );
  }
  const targetRow = strip.length - 2;
  const rowsUp = (rows: number) => `-${(rows / strip.length) * 100}%`;
  return (
    <div className={frame} aria-hidden="true">
      <m.div
        initial={{ y: '0%' }}
        animate={{ y: ['0%', rowsUp(targetRow), rowsUp(targetRow + OVERSHOOT_ROWS), rowsUp(targetRow)] }}
        transition={{
          duration: SPIN_SECONDS,
          times: [0, SLOW_SECONDS / SPIN_SECONDS, (SLOW_SECONDS + PAST_SECONDS) / SPIN_SECONDS, 1],
          ease: [slowDown, 'easeOut', 'easeInOut'],
        }}
        onAnimationComplete={() => landed.current()}
      >
        {strip.map((name, index) => (
          <p key={index} className="h-[1.3em] truncate">
            {name}
          </p>
        ))}
      </m.div>
    </div>
  );
};
