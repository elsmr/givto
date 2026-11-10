import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useMemo, useRef } from 'react';

export type SpinStatus = 'idle' | 'spinning' | 'skipped';

const LAPS = 6;
const SPIN_SECONDS = 2.6;
const box =
  'h-[1.3em] min-w-[min(80vw,12em)] overflow-hidden bg-surface px-8 text-center font-heading text-[clamp(3rem,9vw,9rem)] leading-[1.3em] font-extrabold text-ink bordered shadow-lg dark:border-control dark:shadow-brand';

type WhoIsNextReelProps = { names: string[]; target: string; status: SpinStatus; onLanded: () => void };

/**
 * "Who's next?": the names still in the rotation fly past and slow down onto `target`, which the
 * server already decided (32). Skipped or reduced motion: a quick fade to the name.
 */
export const WhoIsNextReel = ({ names, target, status, onLanded }: WhoIsNextReelProps) => {
  const reduced = useReducedMotion();
  const strip = useMemo(() => [...Array.from({ length: LAPS }, () => names).flat(), target], [names, target]);
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
      <div className={box}>
        <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
          {target}
        </m.p>
      </div>
    );
  }
  return (
    <div className={box} aria-hidden="true">
      <m.div
        initial={{ y: '0%' }}
        animate={{ y: `-${((strip.length - 1) / strip.length) * 100}%` }}
        transition={{ duration: SPIN_SECONDS, ease: [0.12, 0.75, 0.2, 1] }}
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
