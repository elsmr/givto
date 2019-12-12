const isValidAssignment = (
  assignment: Record<string, string>,
  exceptions: Record<string, string[]>
) => {
  const hasSelfAssignment = Object.entries(assignment).some(
    ([key, value]) => key === value
  );
  const hasException = Object.keys(assignment).some(
    id => exceptions[id] && exceptions[id].includes(assignment[id])
  );

  return !hasSelfAssignment && !hasException;
};

export const assignSecretSantas = (
  ids: string[],
  exceptions: Record<string, string[]> = {}
): Record<string, string> => {
  let assignments: Record<string, string> = {};

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
  } while (!isValidAssignment(assignments, exceptions));

  return assignments;
};
