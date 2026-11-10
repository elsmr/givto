// Seed for s5-account.spec.ts: "family" (Ann organizer, Bob, Cee, Kid managed by Ann; drawn), "solo"
// (Ann alone + an invitee without an account; open), "other" (Bob and Cee only). Every text that
// the deletion checks look for carries the test's `tag`, so parallel runs never see each other's.
import { ObjectId } from 'mongodb';
import { newId } from '@/lib/server/db';
import type { Edition, Participant } from '@/lib/schema/edition';
import type { Group } from '@/lib/schema/group';
import type { Member } from '@/lib/schema/member';
import type { TestDb, User } from '../fixtures';

export const seedAccountData = async (db: TestDb, { ann, bob, cee }: Record<'ann' | 'bob' | 'cee', User>, tag: string, inviteeEmail: string) => {
  const now = new Date();
  const m = { ann: newId(), bob: newId(), cee: newId(), kid: newId(), solo: newId(), inv: newId(), ob: newId(), oc: newId() };
  const g = { family: newId(), solo: newId(), other: newId() };
  const e = { family: newId(), solo: newId(), other: newId() };
  const member = (id: string, name: string, extra: Partial<Member> = {}): Member => ({
    id, name, role: 'member', status: 'joined', joinedAt: now, wishlistView: { shownWishIds: [] }, ...extra,
  });
  const group = (_id: string, slug: string, name: string, members: Member[]): Group => ({
    _id, slug, name, locale: 'en', timeZone: 'Europe/Brussels', defaults: { exchangeMode: 'inPerson' }, createdBy: members[0].userId!,
    members, exclusions: [], households: [], createdAt: now, updatedAt: now,
  });
  await db.groups.insertMany([
    group(g.family, `fam${tag}`, 'Family', [
      member(m.ann, `Annabel ${tag}`, { userId: ann.id, role: 'organizer', joinedAt: new Date(+now - 3e6) }),
      member(m.bob, `Bob ${tag}`, { userId: bob.id, joinedAt: new Date(+now - 2e6) }),
      member(m.cee, `Cee ${tag}`, { userId: cee.id, joinedAt: new Date(+now - 1e6) }),
      member(m.kid, 'Kiddo', { managedBy: m.ann }),
    ]),
    group(g.solo, `solo${tag}`, 'Solo', [
      member(m.solo, `Annabel ${tag}`, { userId: ann.id, role: 'organizer' }),
      member(m.inv, 'Invitee', { status: 'invited' }),
    ]),
    group(g.other, `oth${tag}`, 'Other', [
      member(m.ob, `Bob ${tag}`, { userId: bob.id, role: 'organizer' }),
      member(m.oc, `Cee ${tag}`, { userId: cee.id }),
    ]),
  ]);
  const participant = (memberId: string, extra: Partial<Participant> = {}): Participant => ({
    memberId, participates: true, status: 'joined', addedAt: now, ...extra,
  });
  const edition = (_id: string, groupId: string, status: Edition['status'], participants: Participant[], draw?: Edition['draw']): Edition => ({
    _id, groupId, number: 1, year: 2099, title: 'Secret Santa 2099', giftDay: { date: '2099-12-24' },
    exchangeMode: 'inPerson', avoidPreviousGiftees: false, status, statusChangedAt: { open: now }, participants,
    reveal: { enabled: false }, createdAt: now, updatedAt: now, ...(draw && { draw }),
  });
  const assignments = { [m.ann]: m.bob, [m.bob]: m.cee, [m.cee]: m.kid, [m.kid]: m.ann };
  const address = { lines: [`Annstraat ${tag}`], postalCode: '1000', city: 'Brussel', country: 'BE' };
  await db.editions.insertMany([
    edition(e.family, g.family, 'drawn', [participant(m.ann, { address }), participant(m.bob), participant(m.cee), participant(m.kid)], {
      assignments, drawnAt: now, history: [],
    }),
    edition(e.solo, g.solo, 'open', [participant(m.solo), participant(m.inv, { status: 'invited' })]),
    edition(e.other, g.other, 'open', [participant(m.ob), participant(m.oc)]),
  ]);
  const wish = (ownerId: string, title: string) => ({
    _id: newId(), ownerId, kind: 'wish' as const, title, links: [], reallyWant: false, position: 1, createdAt: now, updatedAt: now,
  });
  // Ann's wish links a product with an imported picture (73): deletion removes both.
  const annImage = new ObjectId();
  await db.raw.collection('wishImages.files').insertOne({
    _id: annImage, length: 0, chunkSize: 261120, uploadDate: now, filename: 'wish-image', metadata: { ownerId: ann.id, contentType: 'image/png' },
  });
  const annLink = { url: `https://shop.test/ann-${tag}`, title: `Ann product ${tag}`, imageId: annImage.toHexString() };
  const w = { ann: { ...wish(ann.id, `Ann wish ${tag}`), links: [annLink] }, bob: wish(bob.id, `Bob wish ${tag}`), kid: wish(m.kid, `Kid wish ${tag}`) };
  await db.wishes.insertMany(Object.values(w));
  await db.claims.insertMany([
    { _id: newId(), wishId: w.ann._id, ownerId: ann.id, editionId: e.family, santaMemberId: m.kid, createdAt: now },
    { _id: newId(), wishId: w.bob._id, ownerId: bob.id, editionId: e.family, santaMemberId: m.ann, createdAt: now },
  ]);
  const tip = (aboutMemberId: string, authorMemberId: string, text: string) => ({
    _id: newId(), editionId: e.family, aboutMemberId, authorMemberId, text, anonymous: false, createdAt: now, updatedAt: now,
  });
  await db.tips.insertMany([
    tip(m.ann, m.bob, `Tip about Ann ${tag}`),
    tip(m.bob, m.ann, `Tip by Ann ${tag}`),
    tip(m.bob, m.cee, `Tip by Cee ${tag}`),
  ]);
  await db.questions.insertOne({ _id: newId(), editionId: e.family, gifteeMemberId: m.ann, askerMemberId: m.kid, text: `Question to Ann ${tag}`, createdAt: now });
  await db.nudges.insertOne({ _id: newId(), editionId: e.family, santaMemberId: m.ann, gifteeMemberId: m.bob, kind: 'emptyWishlist', sendAfter: now, createdAt: now });
  await db.sentNotifications.insertOne({ _id: `drawn:${e.family}:${m.ann}`, kind: 'drawn', editionId: e.family, userId: ann.id, memberId: m.ann, sentAt: now });
  await db.invites.insertOne({
    _id: newId(), groupId: g.solo, memberId: m.inv, email: inviteeEmail, tokenHash: `h-${tag}`, createdAt: now, expiresAt: new Date(+now + 864e5),
  });
  return { m, g, e };
};
