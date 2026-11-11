import { GifteeChangedEmail, gifteeChangedSubject } from '../../../emails/giftee-changed';
import { NamesDrawnEmail, namesDrawnSubject } from '../../../emails/names-drawn';
import { formatBudget } from '../../format-budget';
import { formatLocalDate } from '../../local-date';
import type { Edition } from '../../schema/edition';
import type { Collections } from '../db';
import { log } from '../log';
import { sendNotice } from '../mail/notice';
import { memberRecipient } from '../mail/recipients';
import { groupUrl } from '../mail/urls';
import { runEach } from './run-each';
import { startWishlistSnapshot } from './wishlist-changes';

/**
 * "Names are drawn" to every Santa once, and "you have a new giftee" when a Santa's giftee
 * changes later (late joiner slotted in, someone left). The log key carries the giftee, so
 * a changed assignment is a new key; nothing else needs to know what changed.
 */
export const sendDrawNotices = async (db: Collections, edition: Edition) => {
  const group = await db.groups.findOne({ _id: edition.groupId, deletedAt: { $exists: false } });
  if (!group || !edition.draw) return {};
  const prefix = `drawn:${edition._id}:`;
  const sent = new Set(
    (await db.sentNotifications.find({ _id: { $regex: `^${prefix}` } }, { projection: { _id: 1 } }).toArray()).map((n) => n._id)
  );
  return runEach('drawNotices', Object.entries(edition.draw.assignments), async ([santaId, gifteeId]) => {
    const key = `${prefix}${santaId}:${gifteeId}`;
    if (sent.has(key)) return 'done';
    const santa = group.members.find((m) => m.id === santaId);
    const giftee = group.members.find((m) => m.id === gifteeId);
    if (!santa || !giftee) return undefined;
    await startWishlistSnapshot(db, edition._id, giftee);
    const to = await memberRecipient(db, group, santa);
    if (!to) return 'noRecipient';
    const changed = [...sent].some((id) => id.startsWith(`${prefix}${santaId}:`));
    return sendNotice(db, {
      key,
      kind: changed ? 'gifteeChanged' : 'namesDrawn',
      to,
      groupId: group._id,
      editionId: edition._id,
      memberId: santa.id,
      render: () => {
        const props = { locale: to.locale, group: group.name, url: groupUrl(to.locale, group.slug), forName: to.forName };
        if (changed) return { subject: gifteeChangedSubject(props), body: GifteeChangedEmail(props) };
        const giftDay = edition.giftDay && formatLocalDate(edition.giftDay.date, to.locale);
        const budget = edition.budget && formatBudget(edition.budget, to.locale);
        const addAddress =
          edition.exchangeMode !== 'inPerson' && !to.forName && !edition.participants.some((p) => p.memberId === santa.id && p.address);
        return { subject: namesDrawnSubject(props), body: NamesDrawnEmail({ ...props, giftDay, budget, addAddress }) };
      },
    });
  });
};

/**
 * Sends the notices of an edition whose draw changed (`drawNoticesPendingAt`) and clears the
 * flag, unless one failed (the deliveries job retries) or the draw changed again meanwhile.
 */
export const sendPendingDrawNotices = async (db: Collections, edition: Edition) => {
  const counts = await sendDrawNotices(db, edition);
  if (!counts.failed) {
    await db.editions.updateOne({ _id: edition._id, drawNoticesPendingAt: edition.drawNoticesPendingAt }, { $unset: { drawNoticesPendingAt: true } });
  }
  return counts;
};

/** Right after a draw, re-draw or patch (68). Never fails the change: the deliveries job catches up. */
export const sendDrawNoticesNow = async (db: Collections, editionId: string) => {
  try {
    const edition = await db.editions.findOne({ _id: editionId, drawNoticesPendingAt: { $exists: true } });
    if (edition) await sendPendingDrawNotices(db, edition);
  } catch (error) {
    log.error({ err: error, editionId }, 'draw notices failed');
  }
};
