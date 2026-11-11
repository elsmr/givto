import { GifteeChangedEmail, gifteeChangedSubject } from '../../../emails/giftee-changed';
import { NamesDrawnEmail, namesDrawnSubject } from '../../../emails/names-drawn';
import { formatBudget } from '../../format-budget';
import { formatLocalDate } from '../../local-date';
import type { Edition } from '../../schema/edition';
import { userIdsWithAddress } from '../account/addresses';
import { newId, type Collections } from '../db';
import { log } from '../log';
import { sendNotice } from '../mail/notice';
import { memberRecipient } from '../mail/recipients';
import { groupUrl, inviteUrl } from '../mail/urls';
import { hashToken, randomToken } from '../membership';
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
  const posted = edition.exchangeMode !== 'inPerson';
  const withAddress = posted ? await userIdsWithAddress(db, group.members) : new Set<string>();
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
    // An invitee can't open the group yet (98): their link is a fresh invite for the same email, expiring with theirs.
    const invite = santa.status === 'invited'
      ? await db.invites.findOne({ memberId: santa.id, usedAt: { $exists: false } }, { sort: { createdAt: -1 } })
      : null;
    if (santa.status === 'invited' && !invite) return 'noRecipient';
    const token = invite ? randomToken() : undefined;
    const linkInvite = invite && token ? { ...invite, _id: newId(), tokenHash: hashToken(token), createdAt: new Date() } : undefined;
    if (linkInvite) await db.invites.insertOne(linkInvite);
    const dropLinkInvite = async () => {
      if (linkInvite) await db.invites.deleteOne({ _id: linkInvite._id });
    };
    const result = await sendNotice(db, {
      key,
      kind: changed ? 'gifteeChanged' : 'namesDrawn',
      to,
      groupId: group._id,
      editionId: edition._id,
      memberId: santa.id,
      render: () => {
        const url = token ? inviteUrl(to.locale, group.slug, token) : groupUrl(to.locale, group.slug);
        const props = { locale: to.locale, group: group.name, url, forName: to.forName };
        if (changed) return { subject: gifteeChangedSubject(props), body: GifteeChangedEmail(props) };
        const giftDay = edition.giftDay && formatLocalDate(edition.giftDay.date, to.locale);
        const budget = edition.budget && formatBudget(edition.budget, to.locale);
        const addAddress = posted && !to.forName && !(santa.userId && withAddress.has(santa.userId));
        return { subject: namesDrawnSubject(props), body: NamesDrawnEmail({ ...props, giftDay, budget, addAddress }) };
      },
    }).catch(async (error: unknown) => {
      await dropLinkInvite();
      throw error;
    });
    if (result !== 'sent') await dropLinkInvite();
    return result;
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
