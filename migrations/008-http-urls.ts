// Migration 008 (109): links stored before HttpUrl refused spaces, control characters, quotes and angle brackets.
// The wish editor and the edition settings send their stored links back on save, so one such link would block
// every save. Each one becomes its `new URL(…).href` (percent-encoded, tabs and line breaks dropped), or is dropped
// when even that is no valid link.
import type { Db } from 'mongodb';
import * as v from 'valibot';
import { HttpUrl } from '../lib/schema/common';
import type { Edition } from '../lib/schema/edition';
import type { Wish } from '../lib/schema/wish';
import type { MigrationReport } from './001-v1-to-v2';

export const id = '008-http-urls';

/** The stored url when HttpUrl accepts it, else its normalised href when that passes, else undefined. */
export const cleanHttpUrl = (url: string): string | undefined => {
  if (v.safeParse(HttpUrl, url).success) return url;
  const href = URL.parse(url.trim())?.href;
  return href !== undefined && v.safeParse(HttpUrl, href).success ? href : undefined;
};

export const up = async (db: Db, { apply }: { apply: boolean; now?: Date }): Promise<MigrationReport> => {
  const wishes = db.collection<Wish>('wishes');
  const editions = db.collection<Edition>('editions');
  const linkedWishes = await wishes.find({ 'links.0': { $exists: true } }, { projection: { links: 1 } }).toArray();
  const wishChanges = linkedWishes.flatMap(({ _id, links }) => {
    if (links.every(({ url }) => cleanHttpUrl(url) === url)) return [];
    const cleaned = links.flatMap((link) => {
      const url = cleanHttpUrl(link.url);
      return url === undefined ? [] : [{ ...link, url }];
    });
    return [{ _id, before: links.map((link) => link.url), links: cleaned }];
  });
  const calls = await editions.find({ 'giftDay.callUrl': { $exists: true } }, { projection: { 'giftDay.callUrl': 1 } }).toArray();
  const callChanges = calls.flatMap(({ _id, giftDay }) => {
    const before = giftDay!.callUrl!;
    const callUrl = cleanHttpUrl(before);
    return callUrl === before ? [] : [{ _id, before, callUrl }];
  });
  const droppedLinks = wishChanges.reduce((sum, change) => sum + change.before.length - change.links.length, 0);
  const report: MigrationReport = {
    source: { wishesWithLinks: linkedWishes.length, editionsWithCallUrl: calls.length },
    planned: {
      wishes: wishChanges.length,
      droppedLinks,
      editions: callChanges.length,
      droppedCallUrls: callChanges.filter((change) => change.callUrl === undefined).length,
    },
    conflicts: {},
    invalid: [],
    samples: { wish: wishChanges[0], edition: callChanges[0] },
  };
  if (!apply) return report;
  const wishOps = wishChanges.map(({ _id, links }) => ({ updateOne: { filter: { _id }, update: { $set: { links } } } }));
  const editionOps = callChanges.map(({ _id, callUrl }) => ({
    updateOne: {
      filter: { _id },
      update: callUrl === undefined ? { $unset: { 'giftDay.callUrl': true as const } } : { $set: { 'giftDay.callUrl': callUrl } },
    },
  }));
  const writtenWishes = wishOps.length === 0 ? 0 : (await wishes.bulkWrite(wishOps, { ordered: false })).modifiedCount;
  const writtenEditions = editionOps.length === 0 ? 0 : (await editions.bulkWrite(editionOps, { ordered: false })).modifiedCount;
  return { ...report, written: { wishes: writtenWishes, editions: writtenEditions } };
};
