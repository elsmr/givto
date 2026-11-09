/** @jsxImportSource react */
import type { NudgeKind } from '../lib/schema/nudge';
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

export const psstSubject = ({ locale }: Pick<NoticeProps, 'locale'>) => emailTranslator(locale)('psst.subject');

/** Psst! (30) to the giftee. Nothing about the Santa: not in the copy, not in the subject or headers. */
export const PsstEmail = ({ locale, group, url, forName, unsubscribe, kind }: NoticeProps & { kind: NudgeKind }) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('psst.title')} preheader={t('psst.preheader')} forName={forName} member unsubscribe={unsubscribe}>
      <Text>{t(`psst.${kind}`, { group })}</Text>
      <Text muted>{t('psst.secret')}</Text>
      <Button href={url}>{t('psst.button')}</Button>
    </EmailLayout>
  );
};
