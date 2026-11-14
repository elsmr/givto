// Pure (no server-only imports): the create/edit UI and the server share it (26).
import type { Exclusion } from './draw';

/** Nobody draws someone from a keep-apart row (household) they're in; a person can be in several. */
export const toExclusions = (households: string[][]): Exclusion[] =>
  households.flatMap((ids) => ids.flatMap((from) => ids.filter((to) => to !== from).map((to) => ({ from, to }))));
