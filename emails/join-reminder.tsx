/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

type JoinReminderProps = { locale: Locale; organizer: string; group: string; url: string };

export const joinReminderSubject = ({ locale, group }: Pick<JoinReminderProps, 'locale' | 'group'>) =>
  emailTranslator(locale)('join-reminder.subject', { group });

/** Invited by email, not joined yet (29): once, with a fresh link to the same invite. */
export const JoinReminderEmail = ({ locale, organizer, group, url }: JoinReminderProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('join-reminder.title')} preheader={t('join-reminder.preheader', { organizer })}>
      <Text>{t('join-reminder.greeting')}</Text>
      <Text>{t('join-reminder.body', { organizer, group })}</Text>
      <Button href={url}>{t('join-reminder.button')}</Button>
      <Text muted>{t('join-reminder.expiry')}</Text>
      <Text muted>{t('join-reminder.ignore')}</Text>
    </EmailLayout>
  );
};
