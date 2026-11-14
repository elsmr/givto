import type { ChangeStream } from 'mongodb';
import superjson from 'superjson';
import type { Edition } from '../schema/edition';
import type { Collections } from './db';
import { log } from './log';
import { memberView } from './giftday/giftday-view';

interface Subscriber {
  /** The member view, superjson. */
  send: (data: string) => void;
  /** The change stream failed: end the connection, the client reconnects. */
  close: () => void;
}

/** By edition id. One change stream per server instance, open while anyone listens (97). */
const subscribers = new Map<string, Set<Subscriber>>();
let changes: ChangeStream<Edition> | null = null;

const watch = async (db: Collections) => {
  const stream = db.editions.watch<Edition>([{ $match: { operationType: { $in: ['update', 'replace'] } } }], { fullDocument: 'updateLookup' });
  changes = stream;
  try {
    // One change at a time, so a slow view never overtakes a newer one.
    for await (const change of stream) {
      const edition = 'fullDocument' in change ? change.fullDocument : undefined;
      if (!edition || !subscribers.has(edition._id)) continue;
      const group = await db.groups.findOne({ _id: edition.groupId, deletedAt: { $exists: false } });
      if (!group) continue;
      const data = superjson.stringify(await memberView(db, group, edition));
      for (const subscriber of subscribers.get(edition._id) ?? []) subscriber.send(data);
    }
  } catch (error) {
    if (changes === stream) log.error({ err: error }, 'gift day stream failed');
  } finally {
    // Closed because the last subscriber left (or a new stream took over): nothing to reset.
    if (changes === stream) {
      changes = null;
      const all = [...subscribers.values()].flatMap((set) => [...set]);
      subscribers.clear();
      for (const subscriber of all) subscriber.close();
    }
  }
};

/** The edition's member view after every change to it, until the returned unsubscribe. */
export const subscribeGiftDay = (db: Collections, editionId: string, subscriber: Subscriber) => {
  subscribers.set(editionId, (subscribers.get(editionId) ?? new Set()).add(subscriber));
  if (!changes) void watch(db);
  return () => {
    const set = subscribers.get(editionId);
    set?.delete(subscriber);
    if (set?.size === 0) subscribers.delete(editionId);
    if (subscribers.size === 0 && changes) {
      changes.close().catch((error: unknown) => log.warn({ err: error }, 'gift day stream close failed'));
      changes = null;
    }
  };
};
