/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

/** `postBy` set: a posted exchange ("post it by …"); otherwise "got your gift?". Dates are formatted. */
type ReminderGiftProps = NoticeProps & { giftDay: string; postBy?: string };

export const reminderGiftSubject = ({ locale, group, postBy }: { locale: Locale; group: string; postBy?: string }) => {
  const t = emailTranslator(locale);
  return postBy ? t('reminder-gift.subject-post', { date: postBy }) : t('reminder-gift.subject', { group });
};

/** About a week before gift day, to every Santa (29). */
export const ReminderGiftEmail = ({ locale, group, url, forName, unsubscribe, giftDay, postBy }: ReminderGiftProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout
      locale={locale}
      title={postBy ? t('reminder-gift.title-post') : t('reminder-gift.title')}
      preheader={t('reminder-gift.preheader', { date: giftDay })}
      forName={forName}
      member
      unsubscribe={unsubscribe}
    >
      <Text>{postBy ? t('reminder-gift.body-post', { group, postBy, date: giftDay }) : t('reminder-gift.body', { group, date: giftDay })}</Text>
      <Button href={url}>{t('reminder-gift.button')}</Button>
    </EmailLayout>
  );
};
