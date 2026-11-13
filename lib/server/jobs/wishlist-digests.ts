import { WishlistUpdatedEmail, wishlistUpdatedSubject } from '../../../emails/wishlist-updated';
import type { WishlistNotification } from '../../schema/notification';
import type { Collections } from '../db';
import { sendNotice } from '../mail/notice';
import { memberRecipient } from '../mail/recipients';
import { groupUrl } from '../mail/urls';
import { visibleWishes } from '../wishlist/wish-view';
import { editionContext } from './edition-context';
import { runEach } from './run-each';
import { toSnapshot } from './wishlist-changes';
import { wishlistDiff } from './wishlist-diff';

/**
 * Wishlist digests (35): once a giftee's quiet period (or the cap) has passed, their Santa
 * gets one email listing what's new or changed since the last snapshot, counting only
 * wishes this group sees. Between the draw and gift day only; skipped when the Santa has
 * already looked at the wishlist since the last change.
 */
export const sendWishlistDigests = async (db: Collections, now: Date) => {
  const context = editionContext(db);
  const due = await db.wishlistNotifications.find({ notifyAfter: { $lte: now } }).limit(200).toArray();
  return runEach('wishlistDigest', due, async (pending: WishlistNotification) => {
    const found = await context(pending.editionId);
    const giftee = found?.group.members.find((m) => m.id === pending.gifteeMemberId);
    const current = giftee ? (await visibleWishes(db, giftee)).map(toSnapshot) : [];
    // Take the batch: a change that arrived meanwhile moved notifyAfter, so it waits for the next tick.
    const taken = await db.wishlistNotifications.updateOne(
      { _id: pending._id, notifyAfter: pending.notifyAfter },
      { $set: { snapshot: current, snapshotAt: now }, $unset: { firstChangeAt: true, lastChangeAt: true, notifyAfter: true } }
    );
    if (taken.modifiedCount === 0 || !found || !giftee || found.edition.status !== 'drawn') return 'skipped';
    const { added, updated } = wishlistDiff(pending.snapshot, current);
    if (added.length + updated.length === 0) return 'noChanges';
    const santaId = Object.entries(found.edition.draw?.assignments ?? {}).find(([, gifteeId]) => gifteeId === giftee.id)?.[0];
    const santa = found.group.members.find((m) => m.id === santaId);
    const seenAt = found.edition.participants.find((p) => p.memberId === santaId)?.gifteeWishlistSeenAt;
    if (seenAt && pending.lastChangeAt && seenAt >= pending.lastChangeAt) return 'seen';
    const to = santa && (await memberRecipient(db, found.group, santa));
    if (!to) return 'noRecipient';
    const notice = sendNotice(db, {
      key: `wishlist:${pending._id}:${pending.notifyAfter!.getTime()}`,
      kind: 'wishlistUpdated',
      to,
      category: 'wishlistUpdates',
      editionId: pending.editionId,
      memberId: santa!.id,
      render: (unsubscribe) => {
        const props = {
          locale: to.locale,
          group: found.group.name,
          url: groupUrl(found.group.slug),
          forName: to.forName,
          unsubscribe,
          added: added.map((wish) => wish.title),
          updated: updated.map((wish) => wish.title),
        };
        return { subject: wishlistUpdatedSubject(props), body: WishlistUpdatedEmail(props) };
      },
    });
    // Mailgun failed: put the batch back so the next tick retries it.
    return notice.catch(async (error: unknown) => {
      const { _id, ...batch } = pending;
      await db.wishlistNotifications.replaceOne({ _id }, batch);
      throw error;
    });
  });
};
