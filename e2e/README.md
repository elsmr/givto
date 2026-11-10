# e2e (Playwright)

API specs (`api/`, Playwright's `request`, no browser) and browser specs (`flows/`, later `a11y/`)
against the built app (`next start`), an isolated Mongo and the mail mock.

## Run

```sh
pnpm build        # the app runs as `next start`: build after every app change
pnpm e2e          # everything: desktop + mobile
pnpm e2e:api      # api/ only
pnpm e2e:ui       # flows/ and a11y/ (browser), both projects
pnpm e2e flows/sign-in --project mobile --headed   # any Playwright CLI flags
pnpm exec playwright show-report                   # HTML report (playwright-report/)
```

Needs Docker. `playwright.config.ts` starts and stops everything:

- `webServer`: the mail mock (`tests/mail-mock.mjs`) and `next start`, with every env var the app
  reads set in `env.ts` (never `.env`). The app's output goes to `test-results/server.log`.
- `global-setup.ts`: Mongo in Docker as a single-node replica set (container
  `givto-mongo-e2e-<port>`), stopped at the end. The TTL monitor is off, so documents a test
  expires stay until the app looks at them.
- Ports: app 5001, mail 5091, Mongo 27061. To run two checkouts at once, set other ones:
  `E2E_APP_PORT=5101 E2E_MAIL_PORT=5191 E2E_MONGO_PORT=27161 pnpm e2e`.

Projects: `desktop` (Desktop Chrome) and `mobile` (Pixel 7 in Chromium, 375px wide) for flows and
a11y. API specs run once (no browser, nothing to gain from twice): `api`, then `api-cron` (the
specs that run the cron jobs at real time, `api/s7-*`) after it, with a 3-minute timeout: those
jobs work through every test's data and would stall the app for the others. Fully parallel;
retries 1 in CI, 0 locally; traces on the first retry (`--trace on` to always record one).

## Fixtures (`fixtures.ts`)

Import `test`, `expect` and helpers from `../fixtures`, never from `@playwright/test`.

| Fixture / helper | What |
| --- | --- |
| `signIn(name, { ip?, headers? })` | New account `e2e-<name>-<random>@example.test`, signed in with the emailed code. Returns a `User`: `{ id, email, request, trpc }`. `request` is its own `APIRequestContext` (cookie jar = session). `headers` e.g. `accept-language` for the new account's language. |
| `newClient({ storageState? })` | Anonymous `Client` `{ request, trpc }` with its own cookies and IP. |
| `user.trpc.query(path, input)` / `.mutate(path, input)` | tRPC call, superjson like the app's client. Paths, inputs and outputs typed from `AppRouter`. Returns `{ status, data, error }`; `error.data` has `appCode`, `requestId`, `issues`, `details`. Invalid input on purpose: `{ … } as never`. |
| `ok(result)` | `data` of a 200, or fails with the error. |
| `trpcClient(request)` | The same client for any `APIRequestContext`. |
| `signInPage(page, user)` | Copies the user's session cookie into the browser context (fast; for flows that aren't about signing in). |
| `signInWithUi(page, email)` | Fills the sign-in form on the current page: email → code from the mail mock → Sign in. |
| `mailsTo(to, kind?)` | Mails to an address (oldest first); `kind` = Mailgun tag (`reminderGift`, `psst`, …; sign-in mails have none). |
| `latestMail(to, kind?)` | Newest mail, waiting up to 10s for one. |
| `readSignInMail(mail)` | `{ code, link, token }` from a sign-in mail. |
| `requestSignIn(request, email, { callbackURL?, ip?, headers? })` | Asks for a sign-in mail, checks exactly one arrived, returns `{ mail, code, link, token }`. |
| `signInWithCode(request, email, code)`, `authPost(request, path, body, { ip?, headers? })` | Better Auth calls as the browser makes them (origin header, random IP). |
| `setCookies(response)` | `name=value; …` a response sets (`''` when none). |
| `uniqueEmail(name)`, `randomIp()` | |
| `db` | Typed app collections (`db.groups`, `db.editions`, …, from `lib/server/db.ts`) and `db.raw` (Mongo `Db`) for Better Auth's `verifications`, `sessions`, `passkeys`. Worker-scoped. |
| `runCron(job, { authorization? })` | `GET /api/cron/<job>` with the cron secret (`null`: none). `{ status, body }`. |
| `readServerLog()`, `expectNotLogged(secrets)` | The app's log; no secret in it. |
| `secrets` | Array per test; checked against the server log after the test. `signIn` and `signInWithUi` add their emails, codes and tokens; add your own. |

Every test also gets a random `x-forwarded-for` for `page` and `request` (rate limits are per IP).

Test-only triggers: with `E2E_TEST_HOOKS=1` (set by `env.ts`, refused when `VERCEL_ENV=production`,
see `lib/server/test-hooks.ts`) `draw.runDue({ now, editionIds })` and `giftday.runDue({ now, editionIds })` run the
scheduled jobs at a chosen time; `editionIds` limits the job to the test's own editions.

## Patterns

API spec (`api/<suite>.spec.ts`):

```ts
import { expect, ok, test } from '../fixtures';

test('only the organizer can rename', async ({ signIn }) => {
  const [ann, bob] = await Promise.all([signIn('ann'), signIn('bob')]);
  const group = ok(await ann.trpc.mutate('group.create', { name: 'Family', organizerName: 'Ann', timeZone: 'Europe/Brussels', exchangeMode: 'inPerson' }));
  ok(await bob.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name: 'Bob' }));
  const refused = await bob.trpc.mutate('settings.rename', { groupSlug: group.slug, name: 'Mine' });
  expect(refused.error?.data.appCode).toBe('NOT_ORGANIZER');
});
```

Flow spec (`flows/<flow>.spec.ts`), runs in both projects:

```ts
import { expect, test } from '../fixtures';

test('a member sees the group', async ({ page, signIn, signInPage }) => {
  const ann = await signIn('ann');
  // …seed through ann.trpc…
  await signInPage(page, ann);
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'My groups' })).toBeVisible();
});
```

- Locators by role and accessible name (the English messages in `messages/en`), not CSS.
- Several people at once: `browser.newContext()` per person, `signInPage(otherPage, user)`.
- Steps that build on each other belong in one test with `test.step(…)`, not in serial tests.
- Mobile-only or desktop-only: `test.skip(testInfo.project.name === 'mobile', 'why')`.
- WebAuthn: CDP virtual authenticator, see `flows/sign-in.spec.ts`.

## Parallel safety

Tests run at the same time against one app and one database.

- Own data per test: new users from `signIn`/`uniqueEmail`, own groups. Never reuse names or
  slugs across tests, never depend on another test.
- No global counts: never `countDocuments({})`, `mailsTo` without a recipient, or "the latest
  edition". Scope every query to the test's own ids or emails, and assert with `toContain` on job
  results (`{ drawn: [...] }`), never `toEqual` on the whole list.
- Never clear shared state (`DELETE /messages`, `deleteMany({})`, `updateMany({})`).
- Cron jobs act on the whole database: `runCron(…)` (real time) also moves and mails other
  tests' data that is due by then. So:
  - Test hooks always get `editionIds` (`draw.runDue` and `giftday.runDue`): a test that moves
    time never touches another test's editions.
  - By default, keep dates far ahead: gift days and draw dates in 2099 (`now` relative to them).
  - Only tests that use the real-time crons seed near today (`api/s7-*`, project `api-cron`).
  - Seeded "due" data (past `sendAfter`, `notifyAfter`, …) may be processed by another test's
    `tick`; assert on your own ids (mails to your own users), not on counts in the job result.
- Expiring a sign-in code or link in the database: Better Auth deletes every expired
  verification whenever it looks one up, so another test's sign-in can remove yours before your
  request reaches it. See the retry in `api/core.spec.ts`.
- Rate limits are per IP and per address: helpers use random IPs; don't send more than 5 sign-in
  mails to one address in a test.

## Seeding states

Through the API (preferred, same paths as users):

```ts
const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
// open: a new group's first edition
const group = ok(await ann.trpc.mutate('group.create', {
  name: 'Family', organizerName: 'Ann', timeZone: 'Europe/Brussels', giftDay: { date: '2099-12-24' }, exchangeMode: 'inPerson',
}));
const edition = { groupSlug: group.slug, editionNumber: 1 };
for (const [person, name] of [[bob, 'Bob'], [cee, 'Cee']] as const) {
  ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
}
// drawn: three or more people
ok(await ann.trpc.mutate('draw.run', edition));
// draft: the next edition after a drawn one (`edition.open` opens it)
ok(await ann.trpc.mutate('edition.startNext', { groupSlug: group.slug }));
```

Gift day: through the transition, scoped to your edition (`editionId` from `db.editions`):
`ok(await ann.trpc.mutate('giftday.runDue', { now: '2099-12-24T12:00:00.000Z', editionIds: [editionId] }))`, or directly:

```ts
const { _id: groupId } = (await db.groups.findOne({ slug: group.slug }))!;
await db.editions.updateOne({ groupId, number: 1 }, { $set: { status: 'giftday' } });
```

Insert documents directly (`db.groups.insertOne(…)`) only for states the API can't reach (old
editions, other people's data, past dates); give them unique ids and slugs.

## Converting a smoke suite

One spec per suite (`tests/smoke-s4.mjs` → `api/s4-draw.spec.ts`). Every assertion keeps a
counterpart; one smoke step becomes one test (or a `test.step` inside one when steps share state).
Record the mapping in the ticket (`60-playwright.md`, Findings):

| Old smoke step (file: step name) | New test (file › test › step) | Changes |
| --- | --- | --- |
| `smoke.mjs`: wrong code rejected, expired code rejected | `api/core.spec.ts` › wrong code rejected, expired code rejected | Expires only this address's code (was: every code); retries when a parallel lookup deletes it |
| `smoke.mjs`: server log has no emails, codes or tokens | every test's `secrets` + `afterEach` in `api/core.spec.ts` | Checked per test instead of once at the end |
| … | … | … |
