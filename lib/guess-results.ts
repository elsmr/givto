// Pure: Guess your Santa (62), the results that are out.
import type { Assignments } from './schema/edition';

/** Guesser member id → the member they guessed. */
export type Guesses = Record<string, string>;

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
