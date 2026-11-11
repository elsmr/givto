import { cn } from '@/lib/utils';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useRef, useState } from 'react';
import type { SpinStatus } from './who-is-next-reel';

const HOPS = 13;
/** From the first hop to the last one, however many hops. */
const HOPPING_MS = 2900;
/** Each hop takes this much longer than the one before: fast, then slowing like a ball between pockets. */
const SLOWDOWN = 1.2;
/** Still on the target for a beat (will it hop again?) before the winner pops. */
const HOLD_MS = 450;
const POP_MS = 750;
const hopAt = (hop: number, hops: number) => (HOPPING_MS * (SLOWDOWN ** hop - 1)) / (SLOWDOWN ** (hops - 1) - 1);

/** Back and forth between the cards, ending on `end`; a random length so the first card lit gives nothing away. */
const hopPath = (count: number, end: number) => {
  const length = HOPS + Math.floor(Math.random() * count);
  const path = [end];
  let direction = end === 0 ? 1 : -1;
  while (path.length < length) {
    if (path[0] + direction < 0 || path[0] + direction >= count) direction = -direction;
    path.unshift(path[0] + direction);
  }
  return path;
};

type WhoIsNextEndgameProps = {
  names: string[];
  target: string;
  status: SpinStatus;
  onLanded: () => void;
  /** Each card's: their size outside the presenter. */
  className?: string;
};

/**
 * "Who's next?" with 2 or 3 people left: their names as cards, a highlight hops between them and
 * settles on `target` (already decided, like the reel's), which pops. Skipped or reduced motion: the
 * target lights up straight away. Cards in name order: the unwrap order stays a surprise.
 */
export const WhoIsNextEndgame = ({ names, target, status, onLanded, className }: WhoIsNextEndgameProps) => {
  const reduced = useReducedMotion();
  const [cards] = useState(() => names.toSorted((a, b) => a.localeCompare(b)));
  const end = cards.indexOf(target);
  const [path] = useState(() => hopPath(cards.length, end));
  const [hop, setHop] = useState(-1);
  const [popped, setPopped] = useState(false);
  const quick = status === 'skipped' || (status === 'spinning' && reduced);
  const landed = useRef(onLanded);
  useEffect(() => {
    landed.current = onLanded;
  });

  useEffect(() => {
    if (status === 'idle') return;
    const timers = quick
      ? [setTimeout(() => landed.current(), 400)]
      : [
          ...path.map((_, i) => setTimeout(() => setHop(i), hopAt(i, path.length))),
          setTimeout(() => setPopped(true), HOPPING_MS + HOLD_MS),
          setTimeout(() => landed.current(), HOPPING_MS + HOLD_MS + POP_MS),
        ];
    return () => timers.forEach(clearTimeout);
  }, [status, quick, path]);

  const lit = quick ? end : (path[hop] ?? -1);
  const won = quick || popped;
  return (
    <ul aria-hidden="true" className="flex w-full flex-wrap items-center justify-center gap-4 sm:gap-12">
      {cards.map((name, i) => (
        <m.li
          key={i}
          initial={false}
          animate={{ scale: quick || i !== lit ? 1 : won ? 1.15 : 1.05, opacity: won && i !== end ? 0.35 : 1 }}
          transition={won ? { type: 'spring', stiffness: 400, damping: 12, opacity: { duration: 0.3 } } : { duration: 0.08 }}
          className={cn(
            'max-w-full px-5 py-4 font-heading text-[clamp(2rem,5vw,5rem)] leading-none font-extrabold break-words text-ink bordered sm:px-8 sm:py-6',
            i === lit ? 'bg-yellow shadow-brand' : 'bg-surface shadow-lg dark:border-control dark:shadow-brand',
            className
          )}
        >
          {name}
        </m.li>
      ))}
    </ul>
  );
};
