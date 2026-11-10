import type { Collections } from '../db';
import { listWishes } from './wish-view';

// Doubles keep ~50 halvings between two neighbours; renumber well before that.
const MIN_GAP = 1e-6;

/**
 * Moves a wish to `toIndex` in its owner's list by giving it a position between its new
 * neighbours, so one move is one write. Renumbers the list when the gap gets too small.
 */
export const moveWish = async (db: Collections, ownerId: string, wishId: string, toIndex: number) => {
  const others = (await listWishes(db, ownerId)).filter((wish) => wish._id !== wishId);
  const index = Math.min(toIndex, others.length);
  const before = others[index - 1]?.position;
  const after = others[index]?.position;
  if (before !== undefined && after !== undefined && after - before < MIN_GAP) {
    const order = [...others.slice(0, index).map((w) => w._id), wishId, ...others.slice(index).map((w) => w._id)];
    await db.wishes.bulkWrite(
      order.map((_id, position) => ({ updateOne: { filter: { _id, ownerId }, update: { $set: { position } } } }))
    );
    return;
  }
  const position =
    before === undefined ? (after === undefined ? 0 : after - 1) : after === undefined ? before + 1 : (before + after) / 2;
  await db.wishes.updateOne({ _id: wishId, ownerId }, { $set: { position, updatedAt: new Date() } });
};
