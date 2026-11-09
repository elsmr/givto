import type { WishSnapshot } from '../../schema/notification';
import type * as v from 'valibot';

type Snapshot = v.InferOutput<typeof WishSnapshot>;

/**
 * What a Santa hears about (35): wishes added since the snapshot, and wishes whose title or
 * description changed. Added-then-deleted and reorders give nothing.
 */
export const wishlistDiff = (before: Snapshot[], after: Snapshot[]) => {
  const old = new Map(before.map((wish) => [wish.wishId, wish]));
  const added = after.filter((wish) => !old.has(wish.wishId));
  const updated = after.filter((wish) => {
    const previous = old.get(wish.wishId);
    return previous && (previous.title !== wish.title || (previous.description ?? '') !== (wish.description ?? ''));
  });
  return { added, updated };
};
