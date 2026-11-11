import type { useAnimate } from 'motion/react-mini';

type Animate = ReturnType<typeof useAnimate>[1];
export type Controls = ReturnType<Animate>;

type Ease = [number, number, number, number] | 'easeIn' | 'easeOut' | 'easeInOut';
// [seconds, transform, ease into this key]
type Key = [number, string, Ease?];
type Moves = Partial<Record<string, Key[]>>;

// The parts are the data-part names in components/givto-logo.tsx; the tape and face live inside
// `body`, so they always move with the box. Pixels are viewBox units.

// Quadratic, so a thrown box decelerates and accelerates like it has weight.
const rise: Ease = [0.33, 0.67, 0.67, 1];
const fall: Ease = [0.33, 0, 0.67, 0.33];
const snap: Ease = [0.2, 0.8, 0.4, 1];

const body = (y = 0, rotate = 0, sx = 1, sy = 1) =>
  `translateY(${y}px) rotate(${rotate}deg) scale(${sx}, ${sy})`;
const tilt = (deg = 0) => `rotate(${deg}deg)`;
const scale = (sx = 1, sy = sx) => `scale(${sx}, ${sy})`;

const rnd = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

const end = (moves: Moves) => Math.max(...Object.values(moves).flatMap((keys) => keys!.map(([at]) => at)));

const merge = (...all: Moves[]): Moves =>
  all.reduce<Moves>((merged, moves) => {
    const parts = Object.entries(moves).map(([part, keys]) => [part, [...(merged[part] ?? []), ...keys!]]);
    return { ...merged, ...Object.fromEntries(parts) };
  }, {});

// Every move starts each of its tracks at rest, so a track holds its first key from 0. WAAPI has
// no timeline, so each part becomes one animation spanning the whole run.
const play = (animate: Animate, moves: Moves): Controls[] => {
  const total = end(moves);
  return Object.entries(moves).map(([part, keys]) => {
    const sorted = keys!.toSorted((a, b) => a[0] - b[0]);
    const all: Key[] = [[0, sorted[0][1]], ...sorted, [total, sorted.at(-1)![1]]];
    return animate(
      `[data-part=${part}]`,
      { transform: all.map(([, transform]) => transform) },
      {
        duration: total,
        times: all.map(([at]) => at / total),
        ease: all.slice(1).map(([, , ease]) => ease ?? 'easeInOut'),
      },
    );
  });
};

// Something inside thumps: the box gives a little before it tips.
const jolt = (at: number): Moves => ({
  body: [[at, body()], [at + 0.05, body(0, 0, 1.03, 0.97), snap], [at + 0.12, body()]],
});

// Pushed up onto one bottom corner, then gravity drops it back: the body squashes on landing and
// the box rebounds onto the same corner, a fifth as high.
const rock = (side: -1 | 1, deg: number, at: number): Moves => {
  const up = at + 0.16;
  const down = up + 0.15;
  return {
    [side < 0 ? 'tip-left' : 'tip-right']: [
      [at, tilt()],
      [up, tilt(side * deg), rise],
      [down, tilt(), fall],
      [down + 0.07, tilt(side * deg * 0.2), rise],
      [down + 0.14, tilt(), fall],
    ],
    body: [[down, body()], [down + 0.05, body(0, 0, 1.04, 0.95), snap], [down + 0.2, body()]],
  };
};

const blink = (at: number): Moves => ({
  eyes: [[at, scale()], [at + 0.06, scale(1, 0.1), 'easeIn'], [at + 0.2, scale(), 'easeOut']],
});

/** Loading: something inside rocks the box from corner to corner, then it rests and maybe blinks. One cycle; deal a fresh one each time so the loop doesn't read as a loop. */
export const loadingMoves = (animate: Animate): Controls[] => {
  const [side, other] = Math.random() < 0.5 ? ([-1, 1] as const) : ([1, -1] as const);
  const deg = rnd(7, 10);
  const first = rock(side, deg, 0.08);
  const second = rock(other, deg * rnd(0.55, 0.8), end(first) + rnd(0, 0.06));
  const third = Math.random() < 0.4 ? [rock(side, deg * 0.35, end(second))] : [];
  const rocked = merge(jolt(0), first, second, ...third);
  const pause = rnd(0.5, 1.3);
  const blinks = Math.random() < 0.6 ? [blink(end(rocked) + rnd(0.1, pause - 0.2))] : [];
  return play(animate, merge(rocked, ...blinks, { body: [[end(rocked) + pause, body()]] }));
};

/** Celebrate: a crouch, a big hop and a smaller one off the landing, eyes squeezed on each impact. Once, then rests. */
export const celebrateMoves = (animate: Animate): Controls[] => {
  const lean = Math.random() < 0.5 ? -4 : 4;
  return play(animate, {
    body: [
      [0, body()],
      [0.16, body(0, 0, 1.12, 0.86), 'easeOut'],
      [0.24, body(-6, 0, 0.9, 1.12), 'easeIn'],
      [0.46, body(-34, lean, 1, 1), rise],
      [0.68, body(0, 0, 0.94, 1.06), fall],
      [0.75, body(0, 0, 1.12, 0.88), snap],
      [0.83, body(-4, 0, 0.94, 1.08), 'easeIn'],
      [0.98, body(-16, -lean * 0.6, 1, 1), rise],
      [1.13, body(0, 0, 0.96, 1.04), fall],
      [1.2, body(0, 0, 1.08, 0.92), snap],
      [1.34, body(0, 0, 0.98, 1.02)],
      [1.48, body()],
    ],
    shadow: [
      [0.24, scale()],
      [0.46, scale(0.88), rise],
      [0.68, scale(), fall],
      [0.83, scale()],
      [0.98, scale(0.94), rise],
      [1.13, scale(), fall],
    ],
    eyes: [
      [0, scale()],
      [0.16, scale(1.05, 0.5)],
      [0.3, scale(1.1, 1.2), 'easeOut'],
      [0.68, scale()],
      [0.75, scale(1.1, 0.12), snap],
      [0.9, scale(1.05, 1.1), 'easeOut'],
      [1.13, scale()],
      [1.2, scale(1.05, 0.3), snap],
      [1.42, scale(), 'easeOut'],
    ],
    mouth: [
      [0, scale()],
      [0.16, scale(0.9, 0.6)],
      [0.46, scale(1.15, 1.5), 'easeOut'],
      [0.75, scale(1.15, 0.7), snap],
      [0.98, scale(1.1, 1.3), 'easeOut'],
      [1.2, scale(1.1, 0.8), snap],
      [1.48, scale()],
    ],
  });
};

/** Hover: a nudge, so the box rocks once each way. */
export const hoverMoves = (animate: Animate): Controls[] => {
  const [side, other] = Math.random() < 0.5 ? ([-1, 1] as const) : ([1, -1] as const);
  const first = rock(side, 8, 0);
  return play(animate, merge(first, rock(other, 5, end(first))));
};
