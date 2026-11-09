/** @jsxImportSource react */
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

export const organizerHandoverSubject = ({ locale, group }: Pick<NoticeProps, 'locale' | 'group'>) =>
  emailTranslator(locale)('organizer-handover.subject', { group });

/** The organizer deleted their account and the role passed to this member (55, `group.organizerHandover`). */
export const OrganizerHandoverEmail = ({ locale, group, url }: NoticeProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('organizer-handover.title')} preheader={t('organizer-handover.preheader')} member>
      <Text>{t('organizer-handover.body', { group })}</Text>
      <Button href={url}>{t('organizer-handover.button')}</Button>
    </EmailLayout>
  );
};
