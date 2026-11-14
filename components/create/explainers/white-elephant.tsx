import { cn } from '@/lib/utils';
import { Gamepad2, Gift, Headphones, type LucideIcon, Smile } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useAnimate } from 'motion/react-mini';
import { useEffect } from 'react';

type Track = [seconds: number, value: string | number][];
type Part = { transform?: Track; opacity?: Track };

const LOOP = 8.6;
const at = (x: number, y: number) => `translate(${x}px, ${y}px)`;
const held = { a: at(25, 48), c: at(117, 48), b: at(209, 48) };
const pile = { left: at(104, 22), right: at(130, 22), top: at(117, 2) };

const bump = (x: number, ...starts: number[]): Part => ({
  transform: starts.flatMap((start): Track => [
    [start, at(x, 76)],
    [start + 0.15, at(x, 70)],
    [start + 0.3, at(x, 76)],
  ]),
});
const unwrap = (start: number): Part => ({
  transform: [[start, 'translateY(0) rotate(0deg)'], [start + 0.3, 'translateY(-12px) rotate(-25deg)']],
  opacity: [[start, 1], [start + 0.3, 0]],
});
const reveal = (start: number): Part => ({ transform: [[start, 'scale(0.4)'], [start + 0.3, 'scale(1)']] });

const scene: Record<string, Part> = {
  personA: bump(22, 0.5, 2.5, 5.4),
  personB: bump(206, 1.0, 4.2),
  personC: bump(114, 1.5),
  gift1: { transform: [[0.5, held.a], [1.0, pile.left]] },
  gift3: { transform: [[1.0, held.b], [1.5, pile.right], [5.5, pile.right], [6.0, held.a]] },
  gift2: {
    transform: [[1.5, held.c], [2.0, pile.top], [2.6, pile.top], [3.1, held.a], [4.3, held.a], [5.0, held.b]],
  },
  wrap2: unwrap(3.3),
  item2: reveal(3.3),
  wrap3: unwrap(6.2),
  item3: reveal(6.2),
};

const people = [
  { part: 'personA', fill: 'bg-coral' },
  { part: 'personB', fill: 'bg-mint' },
  { part: 'personC', fill: 'bg-yellow' },
];
const gifts: { id: number; fill: string; Item: LucideIcon }[] = [
  { id: 1, fill: 'bg-coral', Item: Gamepad2 },
  { id: 3, fill: 'bg-mint', Item: Headphones },
  { id: 2, fill: 'bg-yellow', Item: Gamepad2 },
];

const endFrame = (part: string) => {
  const { transform, opacity } = scene[part] ?? {};
  return { transform: transform?.at(-1)?.[1] as string | undefined, opacity: opacity?.at(-1)?.[1] };
};

/**
 * Wordless loop of a white elephant: three people drop wrapped gifts on a shared pile, the first
 * opens one, the second steals it, the first unwraps another. Reduced motion: the final frame.
 */
export const WhiteElephantAnimation = () => {
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    if (reduced || !scope.current) return;
    const options = { duration: LOOP, ease: 'easeInOut', repeat: Infinity } as const;
    const controls = Object.entries(scene).flatMap(([part, tracks]) =>
      Object.entries(tracks).map(([property, keys]) => {
        const all: Track = [[0, keys[0][1]], ...keys, [LOOP, keys.at(-1)![1]]];
        return animate(
          `[data-part=${part}]`,
          { [property]: all.map(([, value]) => value) },
          { ...options, times: all.map(([time]) => time / LOOP) },
        );
      }),
    );
    controls.push(
      animate('[data-part=gifts]', { opacity: [0, 1, 1, 0] }, { ...options, times: [0, 0.3 / LOOP, 8 / LOOP, 8.4 / LOOP] }),
    );
    return () => controls.forEach((control) => control.stop());
  }, [reduced, animate, scope]);

  return (
    <div aria-hidden="true" className="flex h-28 w-full justify-center overflow-hidden border-2 border-outline bg-page">
      <div ref={scope} className="relative h-full w-64 shrink-0">
        {people.map(({ part, fill }) => (
          <span
            key={part}
            data-part={part}
            style={endFrame(part)}
            className={cn(
              'absolute top-0 left-0 flex size-7 items-center justify-center rounded-full border-2 border-outline shadow-sm',
              fill,
            )}
          >
            <Smile className="size-4.5" strokeWidth={2.25} />
          </span>
        ))}
        <div data-part="gifts" className="absolute inset-0">
          {gifts.map(({ id, fill, Item }) => (
            <span
              key={id}
              data-part={`gift${id}`}
              style={endFrame(`gift${id}`)}
              className="absolute top-0 left-0 size-5.5 border-2 border-outline bg-surface shadow-sm"
            >
              <span data-part={`item${id}`} style={endFrame(`item${id}`)} className="flex size-full items-center justify-center">
                <Item className="size-3.5" strokeWidth={2.25} />
              </span>
              <span
                data-part={`wrap${id}`}
                style={endFrame(`wrap${id}`)}
                className={cn('absolute -inset-0.5 flex items-center justify-center border-2 border-outline', fill)}
              >
                <Gift className="size-3.5" strokeWidth={2.25} />
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
