/** @jsxImportSource react */
import { Button } from './ui/button';
import { ItemList } from './ui/item-list';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

type JoinDigestProps = NoticeProps & { names: string[]; people: number };

export const joinDigestSubject = ({ locale, group, names }: Pick<JoinDigestProps, 'locale' | 'group' | 'names'>) =>
  emailTranslator(locale)('join-digest.subject', { count: names.length, name: names[0], group });

/** To the organizer, the day after people joined through the join link (63): who, and how many are in now. */
export const JoinDigestEmail = ({ locale, group, url, unsubscribe, names, people }: JoinDigestProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('join-digest.title', { count: names.length })} preheader={t('join-digest.preheader', { count: people })} member unsubscribe={unsubscribe}>
      <Text>{t('join-digest.body', { count: names.length, group })}</Text>
      <ItemList items={names} />
      <Text>{t('join-digest.total', { count: people })}</Text>
      <Button href={url}>{t('join-digest.button')}</Button>
    </EmailLayout>
  );
};
