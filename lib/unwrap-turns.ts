// Pure: where the unwrapping is (32), from the unwrap order and the turns taken so far.
import type { UnwrapMode, UnwrapTurn } from './schema/edition';

/** Member id → how many gifts their Santa marked (63). Absent: unknown, the presenter says when they're done. */
export type GiftCounts = Record<string, number>;

export interface UnwrapState {
  /** Whose turn it is; null before the start and once everyone is done. */
  current: string | null;
  /** Who's up after `current`, assuming they have more (oneByOne); null when nobody else is. */
  next: string | null;
  /** 1-based; a new round starts each time the turn goes back round the order. */
  round: number;
  /** 1-based number of the current turn. */
  turn: number;
  /** oneByOne: which of their gifts `current` opens now, 1-based ("gift 2 of 3"). */
  currentGift: number;
  doneIds: string[];
  finished: boolean;
}

const turnsOf = (turns: UnwrapTurn[], memberId: string) => turns.filter((t) => t.memberId === memberId).length;

/** Whether this turn of `memberId` is their last: allAtOnce always, oneByOne when their known count is reached. */
export const isLastGift = (mode: UnwrapMode, turns: UnwrapTurn[], memberId: string, counts: GiftCounts = {}) =>
  mode === 'allAtOnce' || (counts[memberId] !== undefined && turnsOf(turns, memberId) + 1 >= counts[memberId]);

/**
 * The turn goes to the next person in `order` (wrapping round) who isn't done. allAtOnce: one
 * turn each, so everyone is done after theirs. oneByOne: done after the turn marked `last`, or once
 * they've had as many turns as their known gift count; the last person left keeps going until
 * they're done too.
 */
export const unwrapState = (
  order: string[],
  mode: UnwrapMode,
  started: boolean,
  turns: UnwrapTurn[],
  counts: GiftCounts = {}
): UnwrapState => {
  const done = new Set(
    order.filter(
      (memberId) =>
        turns.some((t) => t.memberId === memberId && (mode === 'allAtOnce' || t.last)) ||
        (mode === 'oneByOne' && counts[memberId] !== undefined && turnsOf(turns, memberId) >= counts[memberId])
    )
  );
  const after = (memberId: string | undefined, skip: Set<string>) => {
    const from = memberId === undefined ? -1 : order.indexOf(memberId);
    for (let step = 1; step <= order.length; step++) {
      const candidate = order[(from + step) % order.length];
      if (!skip.has(candidate)) return candidate;
    }
    return null;
  };
  const current = started ? after(turns.at(-1)?.memberId, done) : null;
  const currentFinishes = current !== null && isLastGift(mode, turns, current, counts);
  const upNext = current && after(current, currentFinishes ? new Set([...done, current]) : done);
  let round = 1;
  let previous = -1;
  for (const memberId of [...turns.map((t) => t.memberId), ...(current ? [current] : [])]) {
    const index = order.indexOf(memberId);
    if (index <= previous) round++;
    previous = index;
  }
  return {
    current,
    next: upNext && upNext !== current ? upNext : null,
    round,
    turn: turns.length + 1,
    currentGift: current ? turnsOf(turns, current) + 1 : 0,
    doneIds: [...done],
    finished: started && current === null,
  };
};
