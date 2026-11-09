// Pure: where the unwrapping is (32), from the unwrap order and the turns taken so far.
import type { UnwrapMode, UnwrapTurn } from './schema/edition';

export interface UnwrapState {
  /** Whose turn it is; null before the start and once everyone is done. */
  current: string | null;
  /** Who's up after `current`, assuming they have more (oneByOne); null when nobody else is. */
  next: string | null;
  /** 1-based; a new round starts each time the turn goes back round the order. */
  round: number;
  /** 1-based number of the current turn. */
  turn: number;
  doneIds: string[];
  finished: boolean;
}

/**
 * The turn goes to the next person in `order` (wrapping round) who isn't done. allAtOnce: one
 * turn each, so everyone is done after theirs. oneByOne: done after the turn marked `last`; the
 * last person left keeps going until they're done too.
 */
export const unwrapState = (order: string[], mode: UnwrapMode, started: boolean, turns: UnwrapTurn[]): UnwrapState => {
  const done = new Set(turns.filter((t) => mode === 'allAtOnce' || t.last).map((t) => t.memberId));
  const after = (memberId: string | undefined, skip: Set<string>) => {
    const from = memberId === undefined ? -1 : order.indexOf(memberId);
    for (let step = 1; step <= order.length; step++) {
      const candidate = order[(from + step) % order.length];
      if (!skip.has(candidate)) return candidate;
    }
    return null;
  };
  const current = started ? after(turns.at(-1)?.memberId, done) : null;
  const upNext = current && after(current, mode === 'allAtOnce' ? new Set([...done, current]) : done);
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
    doneIds: [...done],
    finished: started && current === null,
  };
};
