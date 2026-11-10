import * as v from 'valibot';
import { ObjectId } from 'mongodb';
import type { Locale } from '../../schema/common';
import type { Group } from '../../schema/group';
import type { Member } from '../../schema/member';
import { NotificationPrefs } from '../../schema/user';
import type { Collections } from '../db';

export interface Recipient {
  email: string;
  /** Account language > the member's > the group's (PLAN-v2). */
  locale: Locale;
  /** Absent for invitees without an account: no preferences and no unsubscribe link. */
  userId?: string;
  prefs: NotificationPrefs;
  /** Emails about a managed member go to their manager, "For <name>". */
  forName?: string;
}

const defaults = v.parse(NotificationPrefs, {});

/** `fallbackLocale` for accounts without a language setting (migrated from the old app, 58). */
const accountRecipient = async (db: Collections, userId: string, fallbackLocale: Locale): Promise<Omit<Recipient, 'forName'> | null> => {
  const user = await db.users.findOne({ _id: new ObjectId(userId) }, { projection: { email: 1, locale: 1, notifications: 1 } });
  return user && { email: user.email, locale: user.locale ?? fallbackLocale, userId, prefs: v.parse(NotificationPrefs, user.notifications ?? {}) };
};

/** Who reads email for this member: their account, their manager's, or the address they were invited at. */
export const memberRecipient = async (db: Collections, group: Group, member: Member): Promise<Recipient | null> => {
  if (member.status === 'removed' || member.status === 'declined') return null;
  if (member.userId) return accountRecipient(db, member.userId, member.locale ?? group.locale);
  const manager = member.managedBy ? group.members.find((m) => m.id === member.managedBy) : undefined;
  if (manager?.userId) {
    const recipient = await accountRecipient(db, manager.userId, manager.locale ?? group.locale);
    return recipient && { ...recipient, forName: member.name };
  }
  const invite = await db.invites.findOne({ memberId: member.id }, { sort: { createdAt: -1 }, projection: { email: 1 } });
  if (!invite) return null;
  const account = await db.users.findOne({ email: invite.email }, { projection: { locale: 1 } });
  return { email: invite.email, locale: account?.locale ?? member.locale ?? group.locale, prefs: defaults };
};
