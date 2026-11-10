// Who drew whom in a test's own drawn group (edition 1), by user. Shared by the flow specs.
import type { TestDb, User } from '../fixtures';

export const drawOf = async (db: TestDb, slug: string, people: User[]) => {
  const { _id: groupId, members } = (await db.groups.findOne({ slug }))!;
  const edition = (await db.editions.findOne({ groupId, number: 1 }))!;
  const assignments = edition.draw!.assignments;
  const memberOf = (user: User) => members.find((m) => m.userId === user.id)!;
  const userOf = (memberId: string) => people.find((person) => memberOf(person).id === memberId)!;
  return {
    groupId,
    editionId: edition._id,
    assignments,
    memberIdOf: (user: User) => memberOf(user).id,
    nameOf: (user: User) => memberOf(user).name,
    gifteeOf: (user: User) => userOf(assignments[memberOf(user).id]),
    santaOf: (user: User) => userOf(Object.entries(assignments).find(([, gifteeId]) => gifteeId === memberOf(user).id)![0]),
  };
};
