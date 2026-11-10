import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useRef, useState } from 'react';

export type SpinStatus = 'idle' | 'spinning' | 'skipped';

/** Long enough to feel like a wheel however few names there are. */
const MIN_ROWS = 40;
const SPIN_SECONDS = 5.6;
/** It drifts this far past the target (in rows) at the end of the slowdown, then settles back. */
const OVERSHOOT_ROWS = 0.2;
/** Fast at first, then a long slow tail: the last few names tick by one by one. */
const slowDown = (t: number) => 1 - (1 - t) ** 3;
const box =
  'h-[1.3em] min-w-[min(80vw,12em)] overflow-hidden bg-surface px-8 text-center font-heading text-[clamp(3rem,9vw,9rem)] leading-[1.3em] font-extrabold text-ink bordered shadow-lg dark:border-control dark:shadow-brand';

const shuffled = (items: string[]) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

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

type WhoIsNextReelProps = { names: string[]; target: string; status: SpinStatus; onLanded: () => void };

/**
 * "Who's next?" with 4+ people left: the names spin by like a roulette wheel and slow down onto
 * `target`, which the server already decided (32). Skipped or reduced motion: a quick fade to the name.
 * The turn that follows announces the name (the stage is a live region), so the reel stays aria-hidden.
 */
export const WhoIsNextReel = ({ names, target, status, onLanded }: WhoIsNextReelProps) => {
  const reduced = useReducedMotion();
  // One strip per turn (the stage remounts the reel for each): a re-render mid-spin must not reshuffle it.
  const [strip] = useState(() => reelStrip(names, target));
  const quick = status === 'skipped' || (status === 'spinning' && reduced);
  const landed = useRef(onLanded);
  useEffect(() => {
    landed.current = onLanded;
  });

  useEffect(() => {
    if (!quick) return;
    const timer = setTimeout(() => landed.current(), 400);
    return () => clearTimeout(timer);
  }, [quick]);

  if (status === 'idle') return <p className={box}>?</p>;
  if (quick) {
    return (
      <div className={box} aria-hidden="true">
        <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
          {target}
        </m.p>
      </div>
    );
  }
  const targetRow = strip.length - 2;
  const rowsUp = (rows: number) => `-${(rows / strip.length) * 100}%`;
  return (
    <div className={box} aria-hidden="true">
      <m.div
        initial={{ y: '0%' }}
        animate={{ y: ['0%', rowsUp(targetRow + OVERSHOOT_ROWS), rowsUp(targetRow)] }}
        transition={{ duration: SPIN_SECONDS, times: [0, 0.92, 1], ease: [slowDown, 'easeInOut'] }}
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
