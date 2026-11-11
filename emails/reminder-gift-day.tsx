/** @jsxImportSource react */
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

type ReminderGiftDayProps = NoticeProps & { time?: string; place?: string; callUrl?: string };

export const reminderGiftDaySubject = ({ locale, group }: Pick<NoticeProps, 'locale' | 'group'>) =>
  emailTranslator(locale)('reminder-gift-day.subject', { group });

/** The morning of gift day (29, 31); by post, the video call to unwrap together (87). */
export const ReminderGiftDayEmail = ({ locale, group, url, unsubscribe, time, place, callUrl }: ReminderGiftDayProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('reminder-gift-day.title')} preheader={t('reminder-gift-day.preheader')} member unsubscribe={unsubscribe}>
      <Text>{t('reminder-gift-day.body', { group })}</Text>
      {(time || place) && (
        <Text>
          {time && t('reminder-gift-day.when', { time })}
          {time && place && <br />}
          {place && t('reminder-gift-day.where', { place })}
        </Text>
      )}
      {callUrl && (
        <Text>
          {t('reminder-gift-day.call')}{' '}
          <a href={callUrl} style={{ color: 'inherit', textDecoration: 'underline', wordBreak: 'break-all' }}>
            {callUrl}
          </a>
        </Text>
      )}
      <Button href={url}>{t('reminder-gift-day.button')}</Button>
    </EmailLayout>
  );
};
