import { useReducedMotion } from 'motion/react';
import { useAnimate } from 'motion/react-mini';
import { type ReactNode, type Ref, useLayoutEffect } from 'react';

/** Where a part sits at one moment, in viewBox units; parts are drawn centred on their origin. */
export type Pose = { x: number; y: number; opacity?: number; scale?: number; rotate?: number };
export type Track = [seconds: number, pose: Pose][];

export const GROUND_Y = 84;
export const HEAD_Y = 56;
export const ground = (x: number): Pose => ({ x, y: GROUND_Y });
export const head = (x: number): Pose => ({ x, y: HEAD_Y });
export const hidden = (pose: Pose): Pose => ({ ...pose, opacity: 0, scale: 0.4 });

const mix = (from: number, to: number, t: number) => from + (to - from) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2);

/**
 * An eased move, pre-sampled so every track can run linear: one WAAPI easing would warp the whole
 * loop, not each move. `lift` arcs the path upward, `tilt` rocks it mid-flight.
 */
export const move = (start: number, duration: number, from: Pose, to: Pose, { lift = 0, tilt = 0 } = {}): Track =>
  Array.from({ length: 9 }, (_, step) => {
    const t = easeInOut(step / 8);
    return [
      start + (duration * step) / 8,
      {
        x: mix(from.x, to.x, t),
        y: mix(from.y, to.y, t) - lift * 4 * t * (1 - t),
        opacity: mix(from.opacity ?? 1, to.opacity ?? 1, t),
        scale: mix(from.scale ?? 1, to.scale ?? 1, t),
        rotate: mix(from.rotate ?? 0, to.rotate ?? 0, t) + tilt * Math.sin(Math.PI * t),
      },
    ];
  });

export const hop = (start: number, at: Pose, height = 5): Track => {
  const up = { ...at, y: at.y - height };
  return [...move(start, 0.12, at, up), ...move(start + 0.12, 0.12, up, at)];
};

export const pop = (start: number, at: Pose): Track => [
  [start, hidden(at)],
  [start + 0.15, { ...at, scale: 1.15 }],
  [start + 0.25, at],
];

export const fade = (start: number, at: Pose): Track => move(start, 0.25, at, hidden(at));

const transform = ({ x, y, scale = 1, rotate = 0 }: Pose) =>
  `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;

/**
 * Loops each `data-part`'s track. Before its first key a part holds that pose, after its last it
 * holds the last. Reduced motion: the frame at `still`, so the stills can't drift from the loop.
 * A layout effect, so the first paint is already posed.
 */
export const useLoop = (tracks: Record<string, Track>, loop: number, still: number) => {
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<SVGSVGElement>();

  useLayoutEffect(() => {
    const controls = Object.entries(tracks).map(([part, track]) => {
      const keys = track.toSorted(([a], [b]) => a - b);
      const all: Track = [[0, keys[0][1]], ...keys, [loop, keys.at(-1)![1]]];
      return animate(
        `[data-part="${part}"]`,
        { transform: all.map(([, pose]) => transform(pose)), opacity: all.map(([, pose]) => pose.opacity ?? 1) },
        { duration: loop, times: all.map(([seconds]) => seconds / loop), ease: 'linear', repeat: Infinity },
      );
    });
    if (reduced) {
      controls.forEach((control) => {
        control.pause();
        control.time = still;
      });
    }
    return () => controls.forEach((control) => control.stop());
  }, [tracks, loop, still, reduced, animate]);

  return scope;
};

export const Stage = ({ ref, children }: { ref: Ref<SVGSVGElement>; children: ReactNode }) => (
  <svg
    ref={ref}
    aria-hidden="true"
    viewBox="0 0 256 112"
    strokeWidth={2}
    strokeLinejoin="round"
    className="block h-28 w-full border-2 border-outline bg-page stroke-outline"
  >
    {children}
  </svg>
);

/** A person: the logo's face on a plain box. Shadows are drawn, not filtered, so they move and fade with their part. */
export const Person = ({ fill, children }: { fill: string; children?: ReactNode }) => (
  <>
    <rect x={-10} y={-10} width={24} height={24} className="fill-outline" />
    <rect x={-12} y={-12} width={24} height={24} className={fill} />
    <g stroke="none" className="fill-outline">
      <circle cx={-4} cy={-2} r={2} />
      <circle cx={4} cy={-2} r={2} />
      <path d="M-4 3h8a4 3.5 0 0 1-8 0z" />
    </g>
    {children}
  </>
);

/** A gift: the logo's box without the face. The shadow is the outline's, not the logo's purple: at this size a purple one reads as more ribbon. */
export const Gift = () => (
  <>
    <rect x={-7} y={-7} width={18} height={18} className="fill-outline" />
    <rect x={-9} y={-9} width={18} height={18} className="fill-coral" />
    <g strokeWidth={1.5} className="fill-primary">
      <rect x={-9} y={2.5} width={18} height={3.5} />
      <rect x={2.5} y={-9} width={3.5} height={18} />
    </g>
  </>
);

/** A white card with a hard shadow, for notes, slips and opened gifts. */
export const Card = ({ width, height, children }: { width: number; height: number; children?: ReactNode }) => (
  <>
    <rect x={2 - width / 2} y={2 - height / 2} width={width} height={height} className="fill-outline" />
    <rect x={-width / 2} y={-height / 2} width={width} height={height} className="fill-white" />
    {children}
  </>
);
