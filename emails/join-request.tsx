/** @jsxImportSource react */
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

type JoinRequestProps = NoticeProps & { name: string };

export const joinRequestSubject = ({ locale, name, group }: Pick<JoinRequestProps, 'locale' | 'name' | 'group'>) =>
  emailTranslator(locale)('join-request.subject', { name, group });

/** To the organizer when someone asks to join via the link and approval is on (45). */
export const JoinRequestEmail = ({ locale, group, url, name }: JoinRequestProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('join-request.title')} preheader={t('join-request.preheader')} member>
      <Text>{t('join-request.body', { name, group })}</Text>
      <Button href={url}>{t('join-request.button')}</Button>
    </EmailLayout>
  );
};
