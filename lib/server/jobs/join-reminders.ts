import { JoinReminderEmail, joinReminderSubject } from '../../../emails/join-reminder';
import { INVITE_MS } from '../../schema/invite';
import type { Collections } from '../db';
import { newId } from '../db';
import { sendNotice } from '../mail/notice';
import { memberRecipient } from '../mail/recipients';
import { inviteUrl } from '../mail/urls';
import { hashToken, organizerOf, randomToken } from '../membership';
import { removeMember } from '../remove-member';
import { runEach } from './run-each';

const DAY = 24 * 60 * 60 * 1000;
/** Remind once, this long after the invite, if it's still pending and valid a while longer. */
const REMIND_AFTER_MS = 3 * DAY;
const MIN_VALID_MS = DAY;

/**
 * Email invitees who haven't joined (29). Invite tokens are stored hashed, so the reminder
 * carries a fresh token for the same invited member and email, expiring with the original.
 */
export const sendJoinReminders = async (db: Collections, now: Date) => {
  const invites = await db.invites
    .find({
      usedAt: { $exists: false },
      createdAt: { $lte: new Date(now.getTime() - REMIND_AFTER_MS) },
      expiresAt: { $gt: new Date(now.getTime() + MIN_VALID_MS) },
    })
    .limit(200)
    .toArray();
  return runEach('joinReminder', invites, async (invite) => {
    const group = await db.groups.findOne({ _id: invite.groupId, deletedAt: { $exists: false } });
    const member = group?.members.find((m) => m.id === invite.memberId && m.status === 'invited');
    const organizer = group && organizerOf(group);
    const to = group && member && (await memberRecipient(db, group, member));
    if (!group || !member || !organizer || !to) return 'skipped';
    const key = `reminder:join:${group._id}:${member.id}`;
    if (await db.sentNotifications.countDocuments({ _id: key }, { limit: 1 })) return 'done';
    const token = randomToken();
    const reminderInvite = { ...invite, _id: newId(), tokenHash: hashToken(token), createdAt: now };
    await db.invites.insertOne(reminderInvite);
    const result = await sendNotice(db, {
      key,
      kind: 'joinReminder',
      to: { ...to, email: invite.email },
      groupId: group._id,
      memberId: member.id,
      render: () => {
        const props = { locale: to.locale, group: group.name, organizer: organizer.name, url: inviteUrl(to.locale, group.slug, token) };
        return { subject: joinReminderSubject(props), body: JoinReminderEmail(props) };
      },
    }).catch(async (error: unknown) => {
      await db.invites.deleteOne({ _id: reminderInvite._id });
      throw error;
    });
    if (result !== 'sent') await db.invites.deleteOne({ _id: reminderInvite._id });
    return result;
  });
};

/**
 * Invitees whose invite ran out are out (98), as if they declined: of the current edition and its draw. Expiry is
 * `invitedAt` + 7 days, the same as the draw reads it (draw/rules.ts); the expired invites themselves are gone by TTL.
 */
export const declineExpiredInvitees = async (db: Collections, now: Date, groupIds?: string[]) => {
  const expired = { status: 'invited' as const, invitedAt: { $lte: new Date(now.getTime() - INVITE_MS) } };
  const groups = await db.groups
    .find(
      { deletedAt: { $exists: false }, members: { $elemMatch: expired }, ...(groupIds && { _id: { $in: groupIds } }) },
      { projection: { members: 1 } }
    )
    .limit(200)
    .toArray();
  const invitees = groups.flatMap((group) =>
    group.members
      .filter((m) => m.status === 'invited' && m.invitedAt && m.invitedAt <= expired.invitedAt.$lte)
      .map((m) => ({ groupId: group._id, memberId: m.id }))
  );
  return runEach('expiredInvitees', invitees, async ({ groupId, memberId }) => {
    // A fresh read per invitee: removeMember rewrites the keep-apart rows from the group it's given.
    const group = await db.groups.findOne({ _id: groupId, members: { $elemMatch: { id: memberId, ...expired } } });
    if (!group) return 'skipped';
    await removeMember(db, group, memberId, 'declined');
    return 'declined';
  });
};
