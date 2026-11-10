// Account (was tests/smoke-s5.mjs, part 2): passkeys, name and notification preferences, dashboard,
// export, deletion. Part 1 (sign-in details, locale): s5-sign-in.spec.ts.
import { randomBytes } from 'node:crypto';
import { ObjectId, BSON } from 'mongodb';
import nlEmail from '@/messages/nl/email.json' with { type: 'json' };
import { BASE_URL } from '../env';
import { expect, mailsTo, ok, test, uniqueEmail, type User } from '../fixtures';
import { seedAccountData } from './s5-seed';

const passkeys = (user: User) => ({
  list: async () => (await user.request.get('/api/auth/passkey/list-user-passkeys', { headers: { origin: BASE_URL } })).json(),
  post: async (path: string, body: object) =>
    (await user.request.post(`/api/auth/passkey/${path}`, { headers: { origin: BASE_URL }, data: body })).status(),
});

/** Sign-in and deletion mails have no tag; notification mails (sent by parallel tests' cron runs too) do. */
const untaggedMails = async (email: string) => (await mailsTo(email)).filter((mail) => mail.tags.length === 0);

test('account: passkeys, preferences, dashboard, export, deletion', async ({ signIn, newClient, db, secrets }) => {
  const tag = randomBytes(4).toString('hex');
  const ann = await signIn('ann', { headers: { 'accept-language': 'nl-NL,nl;q=0.9' } });
  const [bob, cee] = await Promise.all([signIn('bob'), signIn('cee')]);
  const inviteeEmail = uniqueEmail('inv');
  secrets.push(inviteeEmail);

  await test.step('passkeys: list, rename, remove (only your own)', async () => {
    const passkey = { publicKey: 'pk', userId: new ObjectId(ann.id), counter: 0, deviceType: 'singleDevice', backedUp: false, createdAt: new Date() };
    const { insertedId } = await db.raw.collection('passkeys').insertOne({ ...passkey, name: 'ann@laptop', credentialID: `cred-${tag}`, transports: 'internal' });
    const id = insertedId.toHexString();
    const annKeys = passkeys(ann);
    expect((await annKeys.list()).map((p: { id: string }) => p.id)).toEqual([id]);
    expect(await annKeys.post('update-passkey', { id, name: 'Laptop' })).toBe(200);
    expect(await annKeys.post('update-passkey', { id, name: 'x'.repeat(300) })).toBe(400);
    expect(await passkeys(bob).post('delete-passkey', { id })).not.toBe(200);
    expect((await annKeys.list())[0].name).toBe('Laptop');
    expect(await annKeys.post('delete-passkey', { id })).toBe(200);
    expect(await db.raw.collection('passkeys').countDocuments({ userId: new ObjectId(ann.id) })).toBe(0);
    await db.raw.collection('passkeys').insertOne({ ...passkey, name: 'kept', credentialID: `cred2-${tag}` });
  });

  await test.step('name and notification preferences saved', async () => {
    expect((await ann.trpc.mutate('account.setName', { name: `Annabel ${tag}` })).status).toBe(200);
    expect((await ann.trpc.mutate('account.setName', { name: 'see www.evil.test' })).status).toBe(400);
    const prefs = { reminders: false, wishlistUpdates: true, santaMessages: false, nextYear: true };
    expect((await ann.trpc.mutate('account.setNotifications', prefs)).status).toBe(200);
    const me = ok(await ann.trpc.query('me.get'));
    expect(me.name).toBe(`Annabel ${tag}`);
    expect(me.notifications).toEqual(prefs);
  });

  const ids = await seedAccountData(db, { ann, bob, cee }, tag, inviteeEmail);

  await test.step('dashboard lists only my groups, with edition status and the giftee cue', async () => {
    const data = ok(await ann.trpc.query('account.groups'));
    const byName = Object.fromEntries(data.map((group) => [group.name, group]));
    expect(Object.keys(byName).sort()).toEqual(['Family', 'Solo']);
    expect(byName.Family.edition!.status).toBe('drawn');
    expect(byName.Family.edition!.gifteeReady).toBe(true);
    expect(byName.Family.edition!.giftDay).toBe('2099-12-24');
    expect(byName.Family.role).toBe('organizer');
    expect(byName.Solo.edition!.gifteeReady).toBe(false);
    expect(JSON.stringify(data), 'no draw data').not.toContain(ids.m.bob);
    expect((await (await newClient()).trpc.query('account.groups')).status).toBe(401);
  });

  await test.step('export contains my data and nobody else’s', async () => {
    const data = ok(await ann.trpc.query('account.export'));
    const text = JSON.stringify(data);
    expect(data.account.email).toBe(ann.email);
    expect(data.wishes.map((w) => w.title)).toEqual([`Ann wish ${tag}`]);
    expect(data.tipsWritten.map((t) => t.text)).toEqual([`Tip by Ann ${tag}`]);
    expect(data.groups).toHaveLength(2);
    expect(data.passkeys).toHaveLength(1);
    const foreign = [bob.email, cee.email, `Bob ${tag}`, `Bob wish ${tag}`, `Kid wish ${tag}`, `Tip about Ann ${tag}`, `Tip by Cee ${tag}`];
    for (const needle of [...foreign, ids.m.bob, ids.m.kid, inviteeEmail, 'publicKey', 'token']) {
      expect(text, `export leaks ${needle}`).not.toContain(needle);
    }
  });

  await test.step('deletion needs the emailed code', async () => {
    expect((await ann.trpc.mutate('account.delete', { code: '000000' })).error?.data.appCode).toBe('INVALID_CODE');
    const before = (await untaggedMails(ann.email)).length;
    expect((await ann.trpc.mutate('account.requestDeletion')).status).toBe(200);
    const mails = await untaggedMails(ann.email);
    expect(mails).toHaveLength(before + 1);
    const mail = mails.at(-1)!;
    expect(mail.subject).toBe(nlEmail['delete-account'].subject);
    const code = mail.text.match(/\b(\d{6})\b/)![1];
    secrets.push(code);
    await db.emailSuppressions.insertOne({ _id: ann.email.toLowerCase(), reason: 'bounce', at: new Date() });
    const wrong = String((Number(code) + 1) % 1e6).padStart(6, '0');
    expect((await ann.trpc.mutate('account.delete', { code: wrong })).error?.data.appCode).toBe('INVALID_CODE');
    ok(await ann.trpc.mutate('account.delete', { code }));
    expect((await ann.trpc.query('me.get')).status).toBe(401);
    expect((await bob.trpc.mutate('account.delete', { code })).error?.data.appCode).toBe('INVALID_CODE');
  });

  await test.step('deletion leaves no personal data in any collection', async () => {
    const needles = [ann.id, ann.email, `Annabel ${tag}`, `Ann wish ${tag}`, `Tip about Ann ${tag}`, `Tip by Ann ${tag}`, `Question to Ann ${tag}`, `Annstraat ${tag}`];
    const hits: string[] = [];
    for (const { name } of await db.raw.listCollections({}, { nameOnly: true }).toArray()) {
      for (const doc of await db.raw.collection(name).find().toArray()) {
        const text = BSON.EJSON.stringify(doc);
        for (const needle of needles) if (text.includes(needle)) hits.push(`${name}: ${needle}`);
      }
    }
    expect(hits).toEqual([]);
  });

  await test.step('after deletion the others’ draw stays valid and the organizer role moved on', async () => {
    const family = (await db.groups.findOne({ _id: ids.g.family }))!;
    const annMember = family.members.find((m) => m.id === ids.m.ann)!;
    expect(annMember.status).toBe('removed');
    expect(annMember.name).toBe('Deleted account');
    expect(annMember.userId).toBeUndefined();
    expect(family.members.find((m) => m.id === ids.m.bob)!.role).toBe('organizer');
    expect(family.members.find((m) => m.id === ids.m.kid)!.managedBy).toBe(ids.m.bob);
    expect(family.createdBy).toBe(bob.id);
    expect(family.organizerHandover!.toMemberId).toBe(ids.m.bob);
    const edition = (await db.editions.findOne({ _id: ids.e.family }))!;
    expect(edition.draw!.assignments).toEqual({ [ids.m.ann]: ids.m.bob, [ids.m.bob]: ids.m.cee, [ids.m.cee]: ids.m.kid, [ids.m.kid]: ids.m.ann });
    expect(edition.participants).toHaveLength(4);
    const solo = { groupId: ids.g.solo };
    const soloLeft = (await db.groups.countDocuments({ _id: ids.g.solo })) + (await db.editions.countDocuments(solo)) + (await db.invites.countDocuments(solo));
    expect(soloLeft).toBe(0);
    expect((await db.wishes.countDocuments({ title: `Kid wish ${tag}` })) + (await db.tips.countDocuments({ text: `Tip by Cee ${tag}` }))).toBe(2);
    expect(ok(await bob.trpc.query('account.groups')).map((g) => g.name).sort()).toEqual(['Family', 'Other']);
  });
});
