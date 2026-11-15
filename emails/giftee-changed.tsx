/** @jsxImportSource react */
import type { Draw } from '../lib/schema/edition';
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

export const gifteeChangedSubject = ({ locale, group }: Pick<NoticeProps, 'locale' | 'group'>) =>
  emailTranslator(locale)('giftee-changed.subject', { group });

const bodies = { organizer: 'giftee-changed.body-redrawn', leave: 'giftee-changed.body-left' } as const;

/**
 * Late joiner slotted in (A→new→B), someone left, or the names were drawn again (`redraw`: by the organizer, or for
 * someone leaving): only the Santa whose giftee changed hears it.
 */
export const GifteeChangedEmail = ({ locale, group, url, forName, redraw = null }: NoticeProps & { redraw?: Draw['redrawCause'] | null }) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('giftee-changed.title')} preheader={t('giftee-changed.preheader')} forName={forName} member>
      <Text>{t(redraw ? bodies[redraw] : 'giftee-changed.body', { group })}</Text>
      <Button href={url}>{t('giftee-changed.button')}</Button>
    </EmailLayout>
  );
};
