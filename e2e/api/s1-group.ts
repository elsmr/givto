// Helpers for the S1 specs (create & join): Ann's group, joining, signing in a given address.
import { expect, latestMail, ok, requestSignIn, signInWithCode, type Client, type TrpcError, type User } from '../fixtures';

export const codeOf = (result: { error?: TrpcError }) => result.error?.data.appCode;

export const createInput = {
  name: 'Family',
  organizerName: 'Ann.Smith',
  timeZone: 'Europe/Brussels',
  giftDay: { date: '2099-12-24', time: '18:00', place: 'Grandma’s' },
  exchangeMode: 'inPerson',
  budget: { currency: 'EUR', amount: 2500 },
} as const;

export const createFamily = async (ann: User) => ok(await ann.trpc.mutate('group.create', createInput));

export const joinAll = async (group: { slug: string; joinToken: string }, people: [User, string][]) => {
  for (const [person, name] of people) {
    const joined = ok(await person.trpc.mutate('join.accept', { groupSlug: group.slug, token: group.joinToken, name }));
    expect(joined.status).toBe('joined');
  }
};

/** A member as the organizer sees it (with email). */
export const memberByEmail = async (organizer: User, groupSlug: string, email: string) =>
  ok(await organizer.trpc.query('group.get', { groupSlug })).members.find((m) => m.email === email);

/** Signs `client` in as `email` (an address that may already have an account) with the emailed code. */
export const signInEmail = async (client: Client, email: string, secrets: string[]) => {
  const { code, token } = await requestSignIn(client.request, email);
  secrets.push(email, code, token);
  expect((await signInWithCode(client.request, email, code)).status()).toBe(200);
  return client;
};

export const inviteTokenFrom = async (email: string) =>
  (await latestMail(email)).text.match(/[?&]invite=([A-Za-z0-9_-]+)/)![1];
