/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';
import type { EditionKind } from '../lib/schema/edition';
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

type JoinReminderProps = { locale: Locale; organizer: string; group: string; kind: EditionKind; url: string };

export const joinReminderSubject = ({ locale, group }: Pick<JoinReminderProps, 'locale' | 'group'>) =>
  emailTranslator(locale)('join-reminder.subject', { group });

/** Invited by email, not joined yet (29): once, with a fresh link to the same invite. */
export const JoinReminderEmail = ({ locale, organizer, group, kind, url }: JoinReminderProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('join-reminder.title')} preheader={t('join-reminder.preheader', { organizer, kind })}>
      <Text>{t('join-reminder.greeting')}</Text>
      <Text>{t('join-reminder.body', { organizer, group, kind })}</Text>
      <Button href={url}>{t('join-reminder.button', { kind })}</Button>
      <Text muted>{t('join-reminder.expiry')}</Text>
      <Text muted>{t('join-reminder.ignore')}</Text>
    </EmailLayout>
  );
};
