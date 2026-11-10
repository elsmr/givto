// The S3 specs' group (was tests/smoke-s3.mjs): Olive organizes and manages Kid (no account),
// Nina is a member who sits out, Eve isn't in the group. Edition 1 starts open (no draw yet),
// edition 2 is drawn with Olive as Kid's Santa, edition 3 is open.
import { ok, type QueryPath, type TestDb, type User } from '../fixtures';
import { assignments, newMember, seedEdition, seedGroup } from './seed-groups';

export type People = Record<'olive' | 'ann' | 'bob' | 'cee' | 'dan' | 'nina' | 'eve', User>;

export const seedBetween = async (db: TestDb, people: People) => {
  const m = {
    olive: newMember(people.olive, 'Olive', { role: 'organizer' }),
    ann: newMember(people.ann, 'Ann'),
    bob: newMember(people.bob, 'Bob'),
    cee: newMember(people.cee, 'Cee'),
    dan: newMember(people.dan, 'Dan'),
    nina: newMember(people.nina, 'Nina'),
  };
  const all = { ...m, kid: newMember(null, 'Kid', { managedBy: m.olive.id }) };
  const group = await seedGroup(db, 'betw', people.olive, Object.values(all));
  const e1 = await seedEdition(db, group, 1, 'open', { inDraw: [all.olive, all.ann, all.bob, all.cee, all.dan, all.kid] });
  const e2 = await seedEdition(db, group, 2, 'drawn', {
    inDraw: [all.olive, all.kid, all.ann, all.bob],
    draw: assignments([[all.olive, all.kid], [all.kid, all.bob], [all.bob, all.ann], [all.ann, all.olive]]),
  });
  await seedEdition(db, group, 3, 'open', { inDraw: [all.olive, all.ann, all.bob] });
  const E1 = { groupSlug: group.slug, editionNumber: 1 };

  return {
    m: all,
    e1,
    e2,
    E1,
    E2: { groupSlug: group.slug, editionNumber: 2 },
    E3: { groupSlug: group.slug, editionNumber: 3 },
    /** The draw: Dan → Ann → Bob → Kid → Olive → Cee → Dan. */
    drawE1: () =>
      db.editions.updateOne(
        { _id: e1._id },
        {
          $set: {
            status: 'drawn',
            draw: {
              assignments: assignments([[all.dan, all.ann], [all.ann, all.bob], [all.bob, all.kid], [all.kid, all.olive], [all.olive, all.cee], [all.cee, all.dan]]),
              drawnAt: new Date(),
              history: [],
            },
          },
        }
      ),
    /** Questions and Psst!s in edition 1 become visible as if their delivery time had come. */
    deliverQuestions: () => db.questions.updateMany({ editionId: e1._id }, { $set: { notifyAfter: new Date(Date.now() - 1000) } }),
    deliverNudges: () => db.nudges.updateMany({ editionId: e1._id }, { $set: { sendAfter: new Date(Date.now() - 1000) } }),
    /** Every response Ann (the subject) gets in edition 1, as [path, json], for the leak checks. */
    annQueries: async (into: [string, string][]) => {
      for (const path of ['tip.authored', 'tip.forGiftee', 'question.forMe', 'question.asked', 'nudge.forMe', 'nudge.status', 'claim.gifteeWishlist'] as QueryPath[]) {
        into.push([path, JSON.stringify(ok(await people.ann.trpc.query(path, E1 as never)))]);
      }
    },
  };
};
