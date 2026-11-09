import { JoinedEmail, joinedSubject } from '../../../emails/joined';
import { JoinRequestEmail, joinRequestSubject } from '../../../emails/join-request';
import type { Collections } from '../db';
import { log } from '../log';
import { sendNotice } from './notice';
import { memberRecipient } from './recipients';
import { groupUrl } from './urls';

/** Best effort: joining must not fail because an email didn't go out. */
const safely = async (kind: string, send: () => Promise<unknown>) => {
  try {
    await send();
  } catch (error) {
    log.error({ err: error, kind }, 'notice failed');
  }
};

/** To the organizer when someone asks to join via the link and approval is on (45). */
export const notifyJoinRequest = (db: Collections, groupId: string, memberId: string) =>
  safely('joinRequest', async () => {
    const group = await db.groups.findOne({ _id: groupId });
    const member = group?.members.find((m) => m.id === memberId && m.status === 'requested');
    if (!group || !member) return;
    for (const organizer of group.members.filter((m) => m.role === 'organizer')) {
      const to = await memberRecipient(db, group, organizer);
      if (!to) continue;
      await sendNotice(db, {
        key: `joinRequest:${group._id}:${member.id}:${member.joinedAt?.getTime() ?? 0}`,
        kind: 'joinRequest',
        to,
        groupId: group._id,
        memberId: organizer.id,
        render: () => {
          const props = { locale: to.locale, group: group.name, name: member.name, url: groupUrl(to.locale, group.slug) };
          return { subject: joinRequestSubject(props), body: JoinRequestEmail(props) };
        },
      });
    }
  });

/** "You're in": the organizer approved the request. */
export const notifyJoined = (db: Collections, groupId: string, memberId: string) =>
  safely('joined', async () => {
    const group = await db.groups.findOne({ _id: groupId });
    const member = group?.members.find((m) => m.id === memberId && m.status === 'joined');
    const to = group && member && (await memberRecipient(db, group, member));
    if (!group || !member || !to) return;
    await sendNotice(db, {
      key: `joined:${group._id}:${member.id}`,
      kind: 'joined',
      to,
      groupId: group._id,
      memberId: member.id,
      render: () => {
        const props = { locale: to.locale, group: group.name, url: groupUrl(to.locale, group.slug) };
        return { subject: joinedSubject(props), body: JoinedEmail(props) };
      },
    });
  });
