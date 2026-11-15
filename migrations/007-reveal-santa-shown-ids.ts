// Migration 007 (106): the Santas shown at turns (62) are kept on `reveal.santaShownIds`, which a new unwrap mode, a
// reshuffle or the presenter's Back don't touch. Editions whose turns were shown before only have them on
// `unwrapOrder.progress.santaShownIds`: copied over, so they stay out.
import type { Db } from 'mongodb';
import type { MigrationReport } from './001-v1-to-v2';

export const id = '007-reveal-santa-shown-ids';

type OldEdition = { _id: string; reveal?: { santaShownIds?: string[] }; unwrapOrder?: { progress?: { santaShownIds?: string[] } } };

const missing = {
  $expr: {
    $not: {
      $setIsSubset: [{ $ifNull: ['$unwrapOrder.progress.santaShownIds', []] }, { $ifNull: ['$reveal.santaShownIds', []] }],
    },
  },
};

export const up = async (db: Db, { apply }: { apply: boolean; now?: Date }): Promise<MigrationReport> => {
  const editions = db.collection<OldEdition>('editions');
  const sample = await editions.findOne(missing, { projection: { reveal: 1, 'unwrapOrder.progress.santaShownIds': 1 } });
  const report: MigrationReport = {
    source: { editions: await editions.countDocuments() },
    planned: { editions: await editions.countDocuments(missing) },
    conflicts: {},
    invalid: [],
    samples: sample ? { edition: sample } : {},
  };
  if (!apply) return report;
  const { modifiedCount } = await editions.updateMany(missing, [
    {
      $set: {
        'reveal.santaShownIds': { $setUnion: [{ $ifNull: ['$reveal.santaShownIds', []] }, '$unwrapOrder.progress.santaShownIds'] },
      },
    },
  ]);
  return { ...report, written: { editions: modifiedCount } };
};
