/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';
import type { EditionKind } from '../lib/schema/edition';
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

/** `kind`: the group's current edition's, as the join page says it. */
type InviteProps = { locale: Locale; organizer: string; group: string; kind: EditionKind; url: string };

export const inviteSubject = ({ locale, organizer, group }: Pick<InviteProps, 'locale' | 'organizer' | 'group'>) =>
  emailTranslator(locale)('invite.subject', { organizer, group });

export const InviteEmail = ({ locale, organizer, group, kind, url }: InviteProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('invite.title')} preheader={t('invite.preheader', { kind })}>
      <Text>{t('invite.greeting')}</Text>
      <Text>{t('invite.body', { organizer, group, kind })}</Text>
      <Button href={url}>{t('invite.button', { kind })}</Button>
      <Text muted>{t('invite.expiry')}</Text>
      <Text muted>{t('invite.ignore')}</Text>
    </EmailLayout>
  );
};
