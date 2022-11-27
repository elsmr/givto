const isValidAssignment = (
  assignment: Record<string, string>,
  exclusions: Record<string, string[]>
) => {
  const hasSelfAssignment = Object.entries(assignment).some(
    ([key, value]) => key === value
  );
  const hasException = Object.keys(assignment).some(
    (id) => exclusions[id] && exclusions[id].includes(assignment[id])
  );

  return !hasSelfAssignment && !hasException;
};

export const assignSecretSantas = (
  ids: string[],
  exclusions: { from: string; to: string }[] = []
): Record<string, string> => {
  let assignments: Record<string, string> = {};
  const exclusionsById = exclusions.reduce(
    (acc, exclusion) => ({
      ...acc,
      [exclusion.from]: [...(acc[exclusion.from] ?? []), exclusion.to],
      [exclusion.to]: [...(acc[exclusion.to] ?? []), exclusion.from],
    }),
    {} as Record<string, string[]>
  );

  console.log(exclusionsById);

  do {
    let userIdsToAssign = [...ids];
    let userIdsToPick = [...ids];

    while (userIdsToAssign.length > 0) {
      const userId = userIdsToAssign.pop() as string;
      const randomIndex = Math.floor(Math.random() * userIdsToPick.length);
      const assignedUserId = userIdsToPick[randomIndex];
      userIdsToPick.splice(randomIndex, 1);
      assignments[userId] = assignedUserId;
    }
  } while (!isValidAssignment(assignments, exclusionsById));

  return assignments;
};
