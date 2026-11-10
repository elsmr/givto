// Pure: changes to a finished draw that touch as few Santas as possible (late joiners, people leaving).
import { allowedBy, type Exclusion } from './draw';

type Assignments = Record<string, string>;
type RandomInt = (max: number) => number;

/**
 * Late joiner: A→B becomes A→joiner→B, for a random A where both new pairs are allowed.
 * Only A's giftee changes. Null when nobody fits.
 */
export const slotIn = (
  assignments: Assignments,
  joiner: string,
  exclusions: Exclusion[],
  randomInt: RandomInt
): Assignments | null => {
  const allowed = allowedBy(exclusions);
  const santas = Object.keys(assignments).filter(
    (santa) => allowed(santa, joiner) && allowed(joiner, assignments[santa])
  );
  if (santas.length === 0) return null;
  const santa = santas[randomInt(santas.length)];
  return { ...assignments, [santa]: joiner, [joiner]: assignments[santa] };
};

/**
 * Someone leaves: A→leaver→B becomes A→B. When A may not give to B (A is B, or excluded),
 * A swaps with a random other Santa C instead (A→D, C→B), so two giftees change. Null when
 * neither works; unchanged when the leaver isn't in the draw.
 */
export const takeOut = (
  assignments: Assignments,
  leaver: string,
  exclusions: Exclusion[],
  randomInt: RandomInt
): Assignments | null => {
  const { [leaver]: giftee, ...rest } = assignments;
  const santa = Object.keys(rest).find((id) => rest[id] === leaver);
  if (giftee === undefined || santa === undefined) return assignments;
  const allowed = allowedBy(exclusions);
  if (allowed(santa, giftee)) return { ...rest, [santa]: giftee };
  const swaps = Object.keys(rest).filter((other) => other !== santa && allowed(santa, rest[other]) && allowed(other, giftee));
  if (swaps.length === 0) return null;
  const other = swaps[randomInt(swaps.length)];
  return { ...rest, [santa]: rest[other], [other]: giftee };
};

/** Santas whose giftee is different (or new) in `next`. */
export const changedSantas = (previous: Assignments, next: Assignments): string[] =>
  Object.keys(next).filter((santa) => previous[santa] !== next[santa]);
