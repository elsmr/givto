import type { ReactElement } from 'react';
import type { UnsubscribeCategory } from '../../../emails/ui/categories';
import type { FooterProps } from '../../../emails/ui/footer';
import type { Collections } from '../db';
import { sendMail, type Mail } from './index';
import type { Recipient } from './recipients';
import { isSuppressed } from './suppression';
import { unsubscribeUrls } from './unsubscribe';

export interface Notice {
  /** Idempotency key: the `sentNotifications` id, e.g. `psst:<nudgeId>`. */
  key: string;
  /** Logged and exported (55): a template name, never names or ids. */
  kind: string;
  to: Recipient;
  /** Opt-out setting this email respects; adds the unsubscribe link and headers. */
  category?: UnsubscribeCategory;
  groupId?: string;
  editionId?: string;
  memberId?: string;
  render: (unsubscribe: FooterProps['unsubscribe']) => { subject: string; body: ReactElement };
  calendar?: Mail['calendar'];
}

export type NoticeResult = 'sent' | 'optedOut' | 'suppressed' | 'duplicate';

const isDuplicateKey = (error: unknown) => (error as { code?: number }).code === 11000;

/**
 * Sends a notification at most once per key (29): the log entry goes in first, so a second
 * run (another cron tick, a retry) finds it and stops. A failed send removes the entry so
 * the next tick tries again.
 */
export const sendNotice = async (db: Collections, notice: Notice): Promise<NoticeResult> => {
  const { to, category } = notice;
  if (category && !to.prefs[category]) return 'optedOut';
  if (await isSuppressed(db, to.email)) return 'suppressed';
  try {
    await db.sentNotifications.insertOne({
      _id: notice.key,
      kind: notice.kind,
      ...(notice.groupId && { groupId: notice.groupId }),
      ...(notice.editionId && { editionId: notice.editionId }),
      ...(to.userId && { userId: to.userId }),
      ...(notice.memberId && { memberId: notice.memberId }),
      sentAt: new Date(),
    });
  } catch (error) {
    if (isDuplicateKey(error)) return 'duplicate';
    throw error;
  }
  const urls = category && to.userId ? unsubscribeUrls(to.userId, category, to.locale) : undefined;
  const { subject, body } = notice.render(urls && category && { url: urls.page, category });
  try {
    await sendMail({ to: to.email, subject, body, unsubscribeUrl: urls?.oneClick, tag: notice.kind, calendar: notice.calendar });
  } catch (error) {
    await db.sentNotifications.deleteOne({ _id: notice.key });
    throw error;
  }
  return 'sent';
};
