// Conspiracy Santa boards (90) in the browser: long links wrap, composers named per board, anonymous only when it hides
// something, delete with undo, and the organizer is warned before a kind switch hides the boards.
import { expect, ok, test, type User } from '../fixtures';

const LONG_URL =
  'https://www.amazon.com/Polaroid-Generation-Instant-Camera-Black/dp/B0BX4XQXZ1/ref=sr_1_3?crid=2Z8J0QK8S7YQ4&keywords=polaroid+now+gen+2&qid=1700000000&sprefix=polaroid%2Caps%2C180&sr=8-3';

const conspiracy = async (people: User[], names: string[], groupName: string) => {
  const [organizer, ...others] = people;
  const group = ok(
    await organizer.trpc.mutate('group.create', { name: groupName, organizerName: names[0], timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson', kind: 'conspiracy' })
  );
  for (const [index, person] of others.entries()) {
    ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: names[index + 1] }));
  }
  return group;
};

test('a long link in a board post or a tip wraps instead of widening the page', async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const group = await conspiracy(people, ['Ann', 'Bob', 'Cee'], 'Long links');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const bobId = (await db.groups.findOne({ slug: group.slug }))!.members.find((m) => m.userId === bob.id)!.id;
  ok(await ann.trpc.mutate('board.create', { ...at, aboutMemberId: bobId, text: `Found it! ${LONG_URL}` }));

  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}#boards`);
  await expect(page.getByText(LONG_URL, { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);

  ok(await ann.trpc.mutate('settings.updateEdition', { ...at, title: 'Long links', kind: 'secretSanta', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' }));
  ok(await ann.trpc.mutate('tip.create', { ...at, aboutMemberId: bobId, text: `Found it! ${LONG_URL}` }));
  await page.goto(`/g/${group.slug}#people`);
  await page.reload();
  await expect(page.getByText(LONG_URL, { exact: false })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('each composer names its board; "Post anonymously" only once a board has more than two writers', async ({ page, signIn, signInPage }) => {
  const people = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const [ann, bob, cee, dan] = people;
  const group = await conspiracy([ann, bob, cee], ['Ann', 'Bob', 'Cee'], 'Three plotters');

  await signInPage(page, ann);
  await page.goto(`/g/${group.slug}#boards`);
  await expect(page.getByRole('textbox', { name: "Your post on Bob's board" })).toBeVisible();
  await expect(page.getByRole('textbox', { name: "Your post on Cee's board" })).toBeVisible();
  await expect(page.getByRole('button', { name: "Post on Cee's board" })).toBeVisible();
  await expect(page.getByRole('switch'), 'Cee would know it was Ann').toHaveCount(0);

  ok(await dan.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Dan' }));
  await page.reload();
  await page.getByRole('switch', { name: "Post anonymously on Bob's board" }).click();
  await page.getByRole('textbox', { name: "Your post on Bob's board" }).fill('A record player?');
  await page.getByRole('button', { name: "Post on Bob's board" }).click();
  await expect(page.getByRole('textbox', { name: "Your post on Bob's board" }), 'a fresh form once posted').toHaveValue('');
  const forCee = ok(await cee.trpc.query('board.list', { groupSlug: group.slug, editionNumber: 1 }))!;
  expect(forCee.boards.find((board) => board.name === 'Bob')!.posts.map((post) => [post.text, post.author])).toEqual([['A record player?', null]]);
});

test('a deleted board post or tip comes back with Undo', async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const [ann, bob] = people;
  const group = await conspiracy(people, ['Ann', 'Bob', 'Cee'], 'Undo');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  const bobId = (await db.groups.findOne({ slug: group.slug }))!.members.find((m) => m.userId === bob.id)!.id;
  ok(await ann.trpc.mutate('board.create', { ...at, aboutMemberId: bobId, text: 'Concert tickets?' }));
  await signInPage(page, ann);

  await test.step('board post', async () => {
    await page.goto(`/g/${group.slug}#boards`);
    await page.getByRole('button', { name: "Delete your post on Bob's board" }).click();
    await expect(page.getByText('Post deleted')).toBeVisible();
    await expect(page.getByText('Concert tickets?')).toBeHidden();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('Concert tickets?')).toBeVisible();
  });

  await test.step('tip', async () => {
    ok(await ann.trpc.mutate('settings.updateEdition', { ...at, title: 'Undo', kind: 'secretSanta', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson' }));
    ok(await ann.trpc.mutate('tip.create', { ...at, aboutMemberId: bobId, text: 'Loves jazz' }));
    await page.goto(`/g/${group.slug}#people`);
    await page.reload();
    await page.getByRole('button', { name: 'Delete your tip about Bob' }).click();
    await expect(page.getByText('Tip deleted')).toBeVisible();
    await expect(page.getByText('Loves jazz')).toBeHidden();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('Loves jazz')).toBeVisible();
  });
});

test('switching an open conspiracy to another kind asks first: the boards are hidden until you switch back', async ({ page, signIn, signInPage, db }) => {
  const people = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await conspiracy(people, ['Ann', 'Bob', 'Cee'], 'Switching');
  const kind = async () => (await db.editions.findOne({ groupId: (await db.groups.findOne({ slug: group.slug }))!._id }))!.kind;
  await signInPage(page, people[0]);
  await page.goto(`/g/${group.slug}/settings`);
  const editionSettings = page.locator('section, details').filter({ has: page.getByRole('heading', { level: 2, name: 'Conspiracy Santa 2099', exact: true }) });
  await editionSettings.getByRole('radio', { name: 'Secret Santa' }).check();
  const save = editionSettings.getByRole('button', { name: 'Save' });

  await save.click();
  const dialog = page.getByRole('dialog', { name: 'Switch away from Conspiracy Santa?' });
  await expect(dialog.getByText('The boards and everything posted on them are hidden until you switch back to Conspiracy Santa.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(await kind()).toBe('conspiracy');

  await save.click();
  await dialog.getByRole('button', { name: 'Switch and save' }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  expect(await kind()).toBe('secretSanta');
});
