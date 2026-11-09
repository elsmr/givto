/** @jsxImportSource react */
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

export const reminderWishlistSubject = ({ locale }: Pick<NoticeProps, 'locale'>) =>
  emailTranslator(locale)('reminder-wishlist.subject');

/** Wishlist still empty as the wishlist date (or gift day − 14 days) nears (29). */
export const ReminderWishlistEmail = ({ locale, group, url, forName, unsubscribe, by }: NoticeProps & { by?: string }) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout
      locale={locale}
      title={t('reminder-wishlist.title')}
      preheader={t('reminder-wishlist.preheader', { group })}
      forName={forName}
      member
      unsubscribe={unsubscribe}
    >
      <Text>{t('reminder-wishlist.body', { group })}</Text>
      {by && <Text>{t('reminder-wishlist.by', { date: by })}</Text>}
      <Button href={url}>{t('reminder-wishlist.button')}</Button>
    </EmailLayout>
  );
};
