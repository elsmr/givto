import { OrganizerHandoverEmail, organizerHandoverSubject } from '../../../emails/organizer-handover';
import type { Collections } from '../db';
import { sendNotice } from '../mail/notice';
import { memberRecipient } from '../mail/recipients';
import { groupUrl } from '../mail/urls';
import { runEach } from './run-each';

/** The organizer deleted their account (S5 sets `group.organizerHandover`): tell the new organizer. */
export const sendHandoverNotices = async (db: Collections, now: Date) => {
  const groups = await db.groups
    .find({ organizerHandover: { $exists: true }, 'organizerHandover.notifiedAt': { $exists: false }, deletedAt: { $exists: false } })
    .toArray();
  return runEach('handover', groups, async (group) => {
    const handover = group.organizerHandover!;
    const organizer = group.members.find((m) => m.id === handover.toMemberId);
    const to = organizer && (await memberRecipient(db, group, organizer));
    const result = to
      ? await sendNotice(db, {
          key: `handover:${group._id}:${handover.at.getTime()}`,
          kind: 'organizerHandover',
          to,
          groupId: group._id,
          memberId: handover.toMemberId,
          render: () => {
            const props = { locale: to.locale, group: group.name, url: groupUrl(group.slug) };
            return { subject: organizerHandoverSubject(props), body: OrganizerHandoverEmail(props) };
          },
        })
      : 'skipped';
    await db.groups.updateOne({ _id: group._id, 'organizerHandover.at': handover.at }, { $set: { 'organizerHandover.notifiedAt': now } });
    return result;
  });
};
