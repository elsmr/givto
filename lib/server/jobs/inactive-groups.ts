import { GroupDeletionEmail, groupDeletionSubject } from '../../../emails/group-deletion';
import { formatLocalDate } from '../../local-date';
import { retention } from '../../privacy';
import type { Group } from '../../schema/group';
import { deleteGroup } from '../account/delete';
import type { Collections } from '../db';
import { sendNotice } from '../mail/notice';
import { memberRecipient } from '../mail/recipients';
import { groupUrl } from '../mail/urls';
import { organizerOf } from '../membership';
import { isoDate, monthsBefore } from './dates';
import { runEach } from './run-each';

const DAY = 24 * 60 * 60 * 1000;
/** Time between the warning email and the deletion. */
const WARNING_DAYS = 30;

const lastActivity = async (db: Collections, group: Group) => {
  const edition = await db.editions.findOne({ groupId: group._id }, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } });
  return Math.max(group.updatedAt.getTime(), edition?.updatedAt.getTime() ?? 0);
};

/**
 * Groups without activity for `inactiveGroupMonths` (55): the organizer gets a warning, and
 * the group goes WARNING_DAYS later unless something happened in it since. The warning is
 * the `sentNotifications` entry, so it's also the clock.
 */
export const cleanUpInactiveGroups = async (db: Collections, now: Date) => {
  const cutoff = monthsBefore(now, retention.inactiveGroupMonths);
  const candidates = await db.groups.find({ updatedAt: { $lt: cutoff } }).limit(200).toArray();
  const counts = await runEach('inactiveGroup', candidates, async (group) => {
    const key = `groupDeletionWarning:${group._id}`;
    const warning = await db.sentNotifications.findOne({ _id: key });
    const active = await lastActivity(db, group);
    if (active >= cutoff.getTime() || (warning && active > warning.sentAt.getTime())) {
      if (warning) await db.sentNotifications.deleteOne({ _id: key });
      return 'active';
    }
    if (warning) {
      if (now.getTime() - warning.sentAt.getTime() < WARNING_DAYS * DAY) return 'warned';
      await deleteGroup(db, group);
      return 'deleted';
    }
    const organizer = organizerOf(group);
    const to = organizer && (await memberRecipient(db, group, organizer));
    const result = to
      ? await sendNotice(db, {
          key,
          kind: 'groupDeletionWarning',
          to,
          groupId: group._id,
          memberId: organizer.id,
          render: () => {
            const date = formatLocalDate(isoDate(new Date(now.getTime() + WARNING_DAYS * DAY)), to.locale);
            const props = { locale: to.locale, group: group.name, url: groupUrl(to.locale, group.slug), date, months: retention.inactiveGroupMonths };
            return { subject: groupDeletionSubject(props), body: GroupDeletionEmail(props) };
          },
        })
      : 'noRecipient';
    // Nobody we can warn: the clock still starts.
    if (result === 'noRecipient' || result === 'suppressed') {
      await db.sentNotifications.insertOne({ _id: key, kind: 'groupDeletionWarning', groupId: group._id, sentAt: now });
    }
    return result;
  });
  return { inactiveGroups: counts };
};
