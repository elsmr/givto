const isValidAssignment = (assignment: Record<string, string>) =>
  !Object.entries(assignment).some(([key, value]) => key === value);

export const assignSecretSantas = (ids: string[]): Record<string, string> => {
  let assignments: Record<string, string> = {};

  do {
    let userIdsToPick = [...ids];
    let userIdsToAssign = [...ids];

    while (userIdsToAssign.length > 0) {
      const userId = userIdsToAssign.pop() as string;
      const randomIndex = Math.floor(Math.random() * userIdsToPick.length);
      const assignedUserId = userIdsToPick[randomIndex];
      userIdsToPick.splice(randomIndex, 1);
      assignments[userId] = assignedUserId;
    }
  } while (!isValidAssignment(assignments));

  return assignments;
};
