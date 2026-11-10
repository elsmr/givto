// Ticket 58: old production data (master's format) → v2.
import { ObjectId } from 'mongodb';
import { expect, mailsTo, ok, test } from '../fixtures';
import { createGroup, join } from './s4-group';

test('emails to an account without a language (migrated) use the group language', async ({ signIn, db }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await createGroup(ann, 'Familie');
  for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) await join(person, group, name);
  await db.groups.updateOne({ slug: group.slug }, { $set: { locale: 'nl' } });
  await db.users.updateOne({ _id: new ObjectId(bob.id) }, { $unset: { locale: true } });
  ok(await ann.trpc.mutate('draw.run', { groupSlug: group.slug, editionNumber: 1 }));
  const [mail] = await mailsTo(bob.email, 'namesDrawn');
  expect(mail.subject).toBe('De namen zijn getrokken in Familie!');
});
