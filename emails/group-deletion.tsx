/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

type GroupDeletionProps = NoticeProps & { date: string; months: number };

export const groupDeletionSubject = ({ locale, group, date }: { locale: Locale; group: string; date: string }) =>
  emailTranslator(locale)('group-deletion.subject', { group, date });

/** Retention (55): to the organizer of a long-inactive group, before it's deleted. */
export const GroupDeletionEmail = ({ locale, group, url, date, months }: GroupDeletionProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('group-deletion.title')} preheader={t('group-deletion.preheader')} member>
      <Text>{t('group-deletion.body', { group, months, date })}</Text>
      <Text>{t('group-deletion.keep')}</Text>
      <Button href={url}>{t('group-deletion.button')}</Button>
    </EmailLayout>
  );
};
