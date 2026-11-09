// Pure (no server-only imports) so the client can reuse the feasibility check.

/** Directed: `from` must not give to `to`. */
export interface Exclusion {
  from: string;
  to: string;
}

/** A Hall violator: more givers than receivers they are allowed to give to. */
export interface StuckGivers {
  givers: string[];
  receivers: string[];
}

type Assignments = Record<string, string>;
type RandomInt = (max: number) => number;

const MAX_SHUFFLES = 1000;
const SWAPS_PER_PERSON = 100;

const allowedBy = (exclusions: Exclusion[]) => {
  const excluded = new Set(exclusions.map(({ from, to }) => JSON.stringify([from, to])));
  return (giver: string, receiver: string) =>
    giver !== receiver && !excluded.has(JSON.stringify([giver, receiver]));
};

// Kuhn's algorithm. When a giver can't be matched, the givers and receivers visited
// while searching for an augmenting path form a Hall violator.
const findMatching = (
  ids: string[],
  allowed: (giver: string, receiver: string) => boolean
): { assignments: Assignments } | { stuck: StuckGivers } => {
  const giverOf = new Map<string, string>();
  const tryAssign = (giver: string, seen: Set<string>): boolean =>
    ids.some((receiver) => {
      if (!allowed(giver, receiver) || seen.has(receiver)) return false;
      seen.add(receiver);
      const current = giverOf.get(receiver);
      if (current !== undefined && !tryAssign(current, seen)) return false;
      giverOf.set(receiver, giver);
      return true;
    });

  for (const giver of ids) {
    const seen = new Set<string>();
    if (!tryAssign(giver, seen)) {
      const receivers = ids.filter((id) => seen.has(id));
      return {
        stuck: { givers: [giver, ...receivers.map((r) => giverOf.get(r)!)], receivers },
      };
    }
  }

  return {
    assignments: Object.fromEntries(
      [...giverOf].map(([receiver, giver]) => [giver, receiver])
    ),
  };
};

const shuffle = (items: string[], randomInt: RandomInt): string[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/** Returns null when every giver can get a receiver. */
export const findStuckGivers = (
  ids: string[],
  exclusions: Exclusion[]
): StuckGivers | null => {
  const result = findMatching(ids, allowedBy(exclusions));
  return 'stuck' in result ? result.stuck : null;
};

/** Throws when the exclusions are infeasible; check with findStuckGivers first. */
export const drawAssignments = (
  ids: string[],
  exclusions: Exclusion[],
  randomInt: RandomInt
): Assignments => {
  const allowed = allowedBy(exclusions);

  // Rejection sampling is uniform over valid draws, but can take long when few draws are valid.
  for (let attempt = 0; attempt < MAX_SHUFFLES; attempt++) {
    const receivers = shuffle(ids, randomInt);
    if (ids.every((giver, i) => allowed(giver, receivers[i]))) {
      return Object.fromEntries(ids.map((giver, i) => [giver, receivers[i]]));
    }
  }

  const result = findMatching(shuffle(ids, randomInt), allowed);
  if ('stuck' in result) {
    throw new Error(`Infeasible exclusions for ${result.stuck.givers.join(', ')}`);
  }

  // Random valid swaps spread the matching over the valid draws (close to uniform).
  const assignments = { ...result.assignments };
  for (let i = 0; i < SWAPS_PER_PERSON * ids.length; i++) {
    const a = ids[randomInt(ids.length)];
    const b = ids[randomInt(ids.length)];
    if (allowed(a, assignments[b]) && allowed(b, assignments[a])) {
      [assignments[a], assignments[b]] = [assignments[b], assignments[a]];
    }
  }
  return assignments;
};
