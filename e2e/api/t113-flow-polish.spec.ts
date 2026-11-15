// 113: someone who accepts an invite after the draw never saw a giftee, so they aren't told it changed.
import { expect, latestMail, ok, test, uniqueEmail } from '../fixtures';
import { createFamily, inviteTokenFrom, joinAll, signInEmail } from './s1-group';
import { editionOf } from './s6-helpers';

test('an invitee whose giftee changed before they accepted isn’t told it changed', async ({ signIn, newClient, secrets, db }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = await createFamily(ann);
  await joinAll(group, [[bob, 'Bob'], [cee, 'Cee']]);
  const fayEmail = uniqueEmail('fay');
  secrets.push(fayEmail);
  const { memberId: fayId } = ok(await ann.trpc.mutate('invite.send', { groupSlug: group.slug, email: fayEmail }));
  const edition = { groupSlug: group.slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('draw.run', edition));
  // Everyone else has started, so the late joiner can only take Fay's giftee.
  for (const santa of [ann, bob, cee]) ok(await santa.trpc.mutate('gift.set', { ...edition, wishIds: [], lines: ['Socks'] }));
  ok(await dan.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Dan' }));
  expect((await editionOf(db, group.slug)).participants.find((p) => p.memberId === fayId)?.gifteeChangedAt).toBeDefined();

  await latestMail(fayEmail, 'namesDrawn');
  const token = await inviteTokenFrom(fayEmail);
  const fay = await signInEmail(await newClient(), fayEmail, secrets);
  ok(await fay.trpc.mutate('invite.accept', { groupSlug: group.slug, token, name: 'Fay' }));
  expect(ok(await fay.trpc.query('draw.mine', edition))).toMatchObject({ giftee: { name: 'Dan' }, changedAt: null, redrawn: false });
});
