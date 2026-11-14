import { useReducedMotion } from 'motion/react';
import { useAnimate } from 'motion/react-mini';
import { useEffect } from 'react';

/**
 * Wordless loop showing how a secret santa plays out; sits above the explanation in the kind's (?)
 * popover. Four people each draw a slip from the hat naming someone else (the slip shows their
 * colour), the slips become gifts that land with their person, and each wonders who sent theirs.
 * Reduced motion: that end frame, still.
 */

const people = [
  { x: 34, fill: 'fill-primary' },
  { x: 98, fill: 'fill-yellow' },
  { x: 162, fill: 'fill-mint' },
  { x: 226, fill: 'fill-primary-muted' },
];
// Who each person draws: nobody draws themselves.
const draws = [2, 0, 3, 1];

const loop = 8;
const headY = 54;
const holdY = 94;
const shadow = '[filter:drop-shadow(2px_2px_0_var(--color-outline))]';

type Key = [at: number, x: number, y: number, opacity?: number, scale?: number, rotate?: number];

const at = (x: number, y: number, scale = 1, rotate = 0) =>
  `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;

const flight = (start: number, duration: number, from: [number, number], to: [number, number], lift: number) =>
  Array.from({ length: 7 }, (_, step): Key => {
    const t = step / 6;
    const x = from[0] + (to[0] - from[0]) * t;
    const y = from[1] + (to[1] - from[1]) * t - lift * 4 * t * (1 - t);
    return [start + duration * t, x, y, 1, 1, Math.sin(t * Math.PI) * 14 * Math.sign(to[0] - from[0])];
  });

const holder = (giver: number) => draws[giver];
const landsAt = (giver: number) => 3.4 + 0.15 * giver + 0.8;

const tracks = (): Record<string, Key[]> => {
  const all: Record<string, Key[]> = {
    hat: people.flatMap((_, i): Key[] => {
      const t = 0.3 + 0.5 * i;
      return [[t, 130, 40], [t + 0.08, 130, 40, 1, 1, -7], [t + 0.18, 130, 40, 1, 1, 5], [t + 0.28, 130, 40]];
    }),
  };
  people.forEach(({ x }, i) => {
    const draw = 0.3 + 0.5 * i;
    const receiver = people[holder(i)].x + 12;
    const takeoff = 3.4 + 0.15 * i;
    all[`slip-${i}`] = [
      [draw, 130, 22, 0, 0.4],
      [draw + 0.12, 130, 8, 1],
      ...flight(draw + 0.12, 0.45, [130, 8], [x, headY], 10).slice(1),
      [2.8, x, headY, 1],
      [2.95, x, headY, 1, 0.01],
      [2.96, x, headY, 0, 0.01],
    ];
    all[`gift-${i}`] = [
      [2.95, x, headY, 0, 0.01],
      [2.96, x, headY, 1, 0.01],
      [3.1, x, headY, 1],
      [takeoff, x, headY, 1],
      ...flight(takeoff, 0.8, [x, headY], [receiver, holdY], 22 + Math.abs(receiver - x) * 0.12).slice(1),
      [6.9, receiver, holdY, 1],
      [7.3, receiver, holdY, 0],
    ];
    const pop = landsAt(people.findIndex((_, giver) => holder(giver) === i)) + 0.1;
    all[`ask-${i}`] = [
      [pop, x, headY - 2, 0, 0.2],
      [pop + 0.15, x, headY - 2, 1, 1.2],
      [pop + 0.3, x, headY - 2, 1],
      [6.9, x, headY - 2, 1],
      [7.3, x, headY - 2, 0],
    ];
  });
  return all;
};

export const SecretSantaAnimation = () => {
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<SVGSVGElement>();

  useEffect(() => {
    if (reduced || !scope.current) return;
    const controls = Object.entries(tracks()).map(([part, keys]) => {
      const all: Key[] = [[0, ...keys[0].slice(1)] as Key, ...keys, [loop, ...keys.at(-1)!.slice(1)] as Key];
      return animate(
        `[data-part=${part}]`,
        {
          transform: all.map(([, x, y, , scale, rotate]) => at(x, y, scale, rotate)),
          opacity: all.map(([, , , opacity = 1]) => opacity),
        },
        { duration: loop, times: all.map(([t]) => t / loop), ease: 'linear', repeat: Infinity },
      );
    });
    return () => controls.forEach((control) => control.stop());
  }, [reduced, animate, scope]);

  const hidden = reduced ? 1 : 0;
  return (
    <svg
      ref={scope}
      aria-hidden="true"
      viewBox="0 0 260 112"
      className="block h-28 w-full border-2 border-outline bg-page stroke-outline [stroke-linejoin:round]"
      strokeWidth={2}
    >
      <g data-part="hat" transform="translate(130 40)" className={shadow}>
        <rect x={-12} y={-26} width={24} height={20} className="fill-ink" />
        <rect x={-12} y={-11} width={24} height={5} className="fill-coral" />
        <rect x={-19} y={-6} width={38} height={6} className="fill-ink" />
      </g>
      {people.map(({ x, fill }, i) => (
        <g key={i} transform={`translate(${x} 79)`}>
          <rect x={-13} y={-13} width={26} height={26} className={`${fill} ${shadow}`} />
          <circle cx={-5} cy={-2} r={1.5} className="fill-outline" />
          <circle cx={5} cy={-2} r={1.5} className="fill-outline" />
          <path d="M-5 4q5 4 10 0" className="fill-none" strokeWidth={1.75} strokeLinecap="round" />
        </g>
      ))}
      {people.map(({ x }, i) => (
        <g key={i} data-part={`ask-${i}`} transform={`translate(${x} ${headY - 2})`} opacity={hidden} className={shadow}>
          <rect x={-8} y={-8} width={16} height={16} className="fill-white" />
          <text y={5} textAnchor="middle" strokeWidth={0} className="fill-outline font-heading text-[13px] font-bold">
            ?
          </text>
        </g>
      ))}
      {people.map(({ x }, i) => (
        <g key={i} data-part={`slip-${i}`} transform={`translate(${x} ${headY})`} opacity={0} className={shadow}>
          <rect x={-11} y={-7} width={22} height={14} className="fill-white" />
          <rect x={-4.5} y={-4.5} width={9} height={9} strokeWidth={1.5} className={people[holder(i)].fill} />
        </g>
      ))}
      {people.map((_, i) => (
        <g
          key={i}
          data-part={`gift-${i}`}
          transform={`translate(${people[holder(i)].x + 12} ${holdY})`}
          opacity={hidden}
          className={shadow}
        >
          <rect x={-7.5} y={-2} width={15} height={9} className="fill-coral" />
          <rect x={-9} y={-6} width={18} height={4} className="fill-coral" />
          <path d="M0-6v13M0-6q-6-6-6 0zM0-6q6-6 6 0z" className="fill-none" strokeWidth={1.5} />
        </g>
      ))}
    </svg>
  );
};
