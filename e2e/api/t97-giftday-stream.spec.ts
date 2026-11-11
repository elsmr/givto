// The gift day stream (97): giftday.get's member view as server-sent events, for members only; the current view
// first, then one after every change to the edition (here the presenter's step).
import superjson from 'superjson';
import { BASE_URL } from '../env';
import { expect, ok, test, type TrpcOutput, type User } from '../fixtures';
import { drawnGroup } from './s6-helpers';

const streamUrl = (slug: string, editionNumber: number) => `${BASE_URL}/api/giftday/${slug}/${editionNumber}`;

const cookieOf = async (user: User) =>
  (await user.request.storageState()).cookies.map(({ name, value }) => `${name}=${value}`).join('; ');

/** Reads `data:` frames off the response; each `next()` resolves with the next view. */
const sseEvents = (body: ReadableStream<Uint8Array>) => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const state = { buffer: '' };
  const next = async (): Promise<TrpcOutput<'giftday.get'>> => {
    const end = state.buffer.indexOf('\n\n');
    if (end < 0) {
      const { value, done } = await reader.read();
      if (done) throw new Error('stream ended');
      state.buffer += decoder.decode(value, { stream: true });
      return next();
    }
    const frame = state.buffer.slice(0, end);
    state.buffer = state.buffer.slice(end + 2);
    const data = frame.split('\n').filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
    return data ? superjson.parse(data) : next();
  };
  return { next, close: () => reader.cancel() };
};

test('anonymous: 401; not a member, or no such edition: 404', async ({ signIn }) => {
  const [ann, bob, cee, dan] = await Promise.all(['ann', 'bob', 'cee', 'dan'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'Stream doors');
  expect((await fetch(streamUrl(group.slug, 1))).status).toBe(401);
  expect((await fetch(streamUrl(group.slug, 1), { headers: { cookie: await cookieOf(dan) } })).status).toBe(404);
  expect((await fetch(streamUrl(group.slug, 2), { headers: { cookie: await cookieOf(bob) } })).status).toBe(404);
  expect((await fetch(streamUrl('no-such-group', 1), { headers: { cookie: await cookieOf(bob) } })).status).toBe(404);
});

test("a member's stream: the current view, then a new one after the presenter's step", async ({ signIn }) => {
  const [ann, bob, cee] = await Promise.all(['ann', 'bob', 'cee'].map((name) => signIn(name)));
  const group = await drawnGroup([ann, bob, cee], 'Stream');
  const at = { groupSlug: group.slug, editionNumber: 1 };
  ok(await ann.trpc.mutate('giftday.shuffle', at));
  const res = await fetch(streamUrl(group.slug, 1), { headers: { cookie: await cookieOf(bob) }, signal: AbortSignal.timeout(15_000) });
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('text/event-stream');
  const events = sseEvents(res.body!);

  const first = await events.next();
  expect(first).toEqual(ok(await bob.trpc.query('giftday.get', at)));
  expect(first.unwrapOrder!.started).toBe(false);

  ok(await ann.trpc.mutate('giftday.advance', { ...at, action: 'start', turnsTaken: 0 }));
  const second = await events.next();
  expect(second).toEqual(ok(await bob.trpc.query('giftday.get', at)));
  expect(second.unwrapOrder!.started).toBe(true);
  await events.close();
});
