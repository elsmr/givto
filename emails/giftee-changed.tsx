/** @jsxImportSource react */
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

export const gifteeChangedSubject = ({ locale, group }: Pick<NoticeProps, 'locale' | 'group'>) =>
  emailTranslator(locale)('giftee-changed.subject', { group });

/** Late joiner slotted in (A→new→B) or someone left: only the Santa whose giftee changed hears it. */
export const GifteeChangedEmail = ({ locale, group, url, forName }: NoticeProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('giftee-changed.title')} preheader={t('giftee-changed.preheader')} forName={forName} member>
      <Text>{t('giftee-changed.body', { group })}</Text>
      <Button href={url}>{t('giftee-changed.button')}</Button>
    </EmailLayout>
  );
};
