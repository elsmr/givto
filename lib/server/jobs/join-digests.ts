import { JoinDigestEmail, joinDigestSubject } from '../../../emails/join-digest';
import { addDays, hourIn, todayIn } from '../../local-date';
import type { Group } from '../../schema/group';
import type { Collections } from '../db';
import { sendNotice } from '../mail/notice';
import { memberRecipient } from '../mail/recipients';
import { groupUrl } from '../mail/urls';
import { addCounts, runEach, type JobCounts } from './run-each';

const DAY = 24 * 60 * 60 * 1000;
/** The digest about yesterday goes out from this hour, the group's local time. */
const DIGEST_FROM_HOUR = 8;

/** People who joined through the link (not email invitees, not the organizer) on `date` in `timeZone`. */
const linkJoinersOn = (group: Group, date: string, timeZone: string) =>
  group.members.filter(
    (m) => m.status === 'joined' && m.role === 'member' && m.userId && !m.invitedAt && m.joinedAt && todayIn(timeZone, m.joinedAt) === date
  );

/**
 * The organizer's daily "who joined" (63): the morning after a day someone joined through the
 * group link, their names. Nothing on days nobody did. `groupIds` (test trigger only) limits it.
 */
export const sendJoinDigests = async (db: Collections, now: Date, groupIds?: string[]) => {
  const groups = await db.groups
    .find({
      deletedAt: { $exists: false },
      ...(groupIds && { _id: { $in: groupIds } }),
      members: { $elemMatch: { status: 'joined', role: 'member', invitedAt: { $exists: false }, joinedAt: { $gte: new Date(now.getTime() - 2 * DAY), $lt: now } } },
    })
    .toArray();
  const counts: JobCounts[] = [];
  for (const group of groups) {
    const { timeZone } = group.defaults;
    if (hourIn(timeZone, now) < DIGEST_FROM_HOUR) continue;
    const yesterday = addDays(todayIn(timeZone, now), -1);
    const names = linkJoinersOn(group, yesterday, timeZone).map((m) => m.name);
    if (names.length === 0) continue;
    const people = group.members.filter((m) => m.status === 'joined').length;
    const organizers = group.members.filter((m) => m.role === 'organizer' && m.status === 'joined');
    counts.push(
      await runEach('joinDigest', organizers, async (organizer) => {
        const to = await memberRecipient(db, group, organizer);
        if (!to) return 'noRecipient';
        return sendNotice(db, {
          key: `joinDigest:${group._id}:${organizer.id}:${yesterday}`,
          kind: 'joinDigest',
          to,
          category: 'joins',
          groupId: group._id,
          memberId: organizer.id,
          render: (unsubscribe) => {
            const props = { locale: to.locale, group: group.name, url: `${groupUrl(to.locale, group.slug)}#people`, unsubscribe, names, people };
            return { subject: joinDigestSubject(props), body: JoinDigestEmail(props) };
          },
        });
      })
    );
  }
  return addCounts(...counts);
};
