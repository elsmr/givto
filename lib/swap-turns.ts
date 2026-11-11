// Pure: where a white elephant swap is (89), from the unwrap order and the moves so far.
import type { SwapMove } from './schema/edition';
import type { UnwrapState } from './unwrap-turns';

/** The third steal freezes a gift (owner). */
export const MAX_STEALS = 3;

export interface SwapGift {
  /** In opening order: "Gift 3". */
  no: number;
  label: string | null;
  holderId: string;
  steals: number;
  frozen: boolean;
}

/** The unwrap state's fields (so the reel and views work as for Secret Santa), plus the table. */
export interface SwapState extends UnwrapState {
  gifts: SwapGift[];
  /** Gifts nobody opened yet. */
  wrapped: number;
  /** The current person was just stolen from: they go again, without a spin. */
  robbed: boolean;
  /** The first player's final steal: swap with any gift that isn't frozen, or keep theirs. */
  final: boolean;
  /** Numbers of the gifts the current person may take. */
  stealable: number[];
}

type Table = { gifts: SwapGift[]; robbedId: string | null };

const play = ({ gifts }: Table, move: SwapMove): Table => {
  if (move.action === 'open') {
    return { gifts: [...gifts, { no: gifts.length + 1, label: move.label ?? null, holderId: move.memberId, steals: 0, frozen: false }], robbedId: null };
  }
  if (move.action === 'keep') return { gifts, robbedId: null };
  const taken = gifts[move.giftNo! - 1];
  // At the final steal they hold one: the person they take from gets it.
  const swapped = gifts.find((gift) => gift.holderId === move.memberId);
  return {
    gifts: gifts.map((gift) =>
      gift === taken
        ? { ...gift, holderId: move.memberId, steals: gift.steals + 1, frozen: gift.steals + 1 >= MAX_STEALS }
        : gift === swapped
          ? { ...gift, holderId: taken.holderId }
          : gift
    ),
    robbedId: swapped ? null : taken.holderId,
  };
};

/**
 * Classic rules (owner): each turn in `order` opens a wrapped gift or steals an opened one; whoever is stolen from goes
 * next (open or steal, but not straight back the gift just taken from them); a gift's third steal freezes it; the turn
 * moves on with every opened gift. Once all are open, the first player may swap theirs for any gift that isn't frozen
 * or keep it, and the game ends. Assumes the moves were legal (`canMove` at each step).
 */
export const swapState = (order: string[], started: boolean, moves: SwapMove[]): SwapState => {
  const { gifts, robbedId } = moves.reduce(play, { gifts: [], robbedId: null });
  const allOpen = order.length > 0 && gifts.length >= order.length;
  const lastOpen = moves.findLastIndex((move) => move.action === 'open');
  const finished = started && allOpen && lastOpen < moves.length - 1;
  const final = started && allOpen && !finished;
  const current = !started || finished ? null : final ? order[0] : (robbedId ?? order[gifts.length] ?? null);
  const justTaken = robbedId ? moves.at(-1)!.giftNo : null;
  const stealable = current
    ? gifts.filter((gift) => !gift.frozen && gift.holderId !== current && gift.no !== justTaken).map((gift) => gift.no)
    : [];
  return {
    current,
    next: null,
    round: 1,
    turn: moves.length + 1,
    currentGift: 0,
    // Who had their turn in the order: the reel spins between the others.
    doneIds: finished ? [...order] : order.slice(0, gifts.length),
    finished,
    gifts,
    wrapped: Math.max(order.length - gifts.length, 0),
    robbed: robbedId !== null,
    final,
    stealable,
  };
};

/** Whether the current person may make this move now. */
export const canMove = (state: SwapState, action: SwapMove['action'], giftNo?: number) =>
  state.current !== null &&
  (action === 'open'
    ? !state.final && state.wrapped > 0
    : action === 'keep'
      ? state.final
      : giftNo !== undefined && state.stealable.includes(giftNo));
