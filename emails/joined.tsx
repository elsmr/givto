/** @jsxImportSource react */
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

export const joinedSubject = ({ locale, group }: Pick<NoticeProps, 'locale' | 'group'>) =>
  emailTranslator(locale)('joined.subject', { group });

/** "You're in": the organizer let them in. */
export const JoinedEmail = ({ locale, group, url }: NoticeProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('joined.title')} preheader={t('joined.preheader')} member>
      <Text>{t('joined.body', { group })}</Text>
      <Button href={url}>{t('joined.button')}</Button>
    </EmailLayout>
  );
};
