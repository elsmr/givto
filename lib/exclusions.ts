// Pure (no server-only imports): the create/edit UI and the server share it (26).
import type { Exclusion } from './draw';

/** Two people who must not draw each other, either way. */
export type KeepApartPair = [string, string];

const bothWays = ([a, b]: KeepApartPair): Exclusion[] => [
  { from: a, to: b },
  { from: b, to: a },
];

/** Nobody draws someone in their own household, and keep-apart pairs don't draw each other. */
export const toExclusions = (households: string[][], pairs: KeepApartPair[]): Exclusion[] => [
  ...households.flatMap((ids) =>
    ids.flatMap((from) => ids.filter((to) => to !== from).map((to) => ({ from, to })))
  ),
  ...pairs.flatMap(bothWays),
];

/** Pairs stored as two directed exclusions, back as one pair each (one-way exclusions are skipped). */
export const toKeepApartPairs = (exclusions: Exclusion[]): KeepApartPair[] => {
  const key = (from: string, to: string) => `${from}>${to}`;
  const stored = new Set(exclusions.map(({ from, to }) => key(from, to)));
  return exclusions
    .filter(({ from, to }) => from < to && stored.has(key(to, from)))
    .map(({ from, to }): KeepApartPair => [from, to]);
};
