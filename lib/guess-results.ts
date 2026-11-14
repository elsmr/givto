// Pure: Guess your Santa (62), the results that are out.
import type { Assignments } from './schema/edition';

/** Guesser member id → the member they guessed. */
export type Guesses = Record<string, string>;

/** Guess the whole draw (82): guesser member id → giftee → the Santa they guessed, their own row included. */
export type Boards = Record<string, Record<string, string>>;

export interface GuessResult {
  memberId: string;
  santaMemberId: string;
  /** null: they didn't guess. */
  guessedMemberId: string | null;
  right: boolean;
}

/**
 * Results for `revealedIds` only, in that order (people whose Santa is out: their turn in the
 * presenter, or everyone once the big reveal is out). Nobody else's guess, nor whether it's right.
 */
export const guessResults = (revealedIds: string[], assignments: Assignments, guesses: Guesses): GuessResult[] => {
  const santaOf = new Map(Object.entries(assignments).map(([santa, giftee]) => [giftee, santa]));
  return revealedIds.flatMap((memberId) => {
    const santaMemberId = santaOf.get(memberId);
    if (!santaMemberId) return [];
    const guessedMemberId = guesses[memberId] ?? null;
    return [{ memberId, santaMemberId, guessedMemberId, right: guessedMemberId === santaMemberId }];
  });
};

/**
 * Guess the whole draw (82): a point per right pair among `revealedIds`, for everyone with a board.
 * Empty until something is out, so it doesn't even say who played. The row for your own giftee never
 * scores: you know it.
 */
export const boardScores = (revealedIds: string[], assignments: Assignments, boards: Boards) => {
  if (revealedIds.length === 0) return [];
  const santaOf = new Map(Object.entries(assignments).map(([santa, giftee]) => [giftee, santa]));
  return Object.entries(boards).map(([memberId, board]) => ({
    memberId,
    points: revealedIds.filter(
      (giftee) => giftee !== assignments[memberId] && santaOf.has(giftee) && board[giftee] === santaOf.get(giftee)
    ).length,
  }));
};

export type Points = { memberId: string; points: number }[];

/** What an edition keeps once done (86): points per board and who guessed their own Santa, from what was out. */
export const editionResults = (revealedIds: string[], assignments: Assignments, boards: Boards) => {
  const guesses = Object.fromEntries(Object.entries(boards).map(([guesser, board]) => [guesser, board[guesser]]));
  return {
    points: boardScores(revealedIds, assignments, boards),
    nailedIds: guessResults(revealedIds, assignments, guesses).filter((result) => result.right).map((result) => result.memberId),
    drawSize: Object.keys(assignments).length,
  };
};

/** Everyone on the top score shares the title; nobody at 0. */
export const champions = (points: Points) => {
  const top = Math.max(0, ...points.map((entry) => entry.points));
  return top === 0 ? [] : points.filter((entry) => entry.points === top).map((entry) => entry.memberId);
};
