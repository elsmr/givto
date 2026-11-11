/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

// Names are validated plain text (43): no links, no @.
type InviteProps = { locale: Locale; organizer: string; group: string; url: string };

export const inviteSubject = ({ locale, organizer, group }: Omit<InviteProps, 'url'>) =>
  emailTranslator(locale)('invite.subject', { organizer, group });

export const InviteEmail = ({ locale, organizer, group, url }: InviteProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('invite.title')} preheader={t('invite.preheader')}>
      <Text>{t('invite.greeting')}</Text>
      <Text>{t('invite.body', { organizer, group })}</Text>
      <Button href={url}>{t('invite.button')}</Button>
      <Text muted>{t('invite.expiry')}</Text>
      <Text muted>{t('invite.ignore')}</Text>
    </EmailLayout>
  );
};
