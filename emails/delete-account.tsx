/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';
import { CodeBox } from './ui/code-box';
import { EmailLayout } from './ui/layout';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

export const deleteAccountSubject = (locale: Locale) => emailTranslator(locale)('delete-account.subject');

export const DeleteAccountEmail = ({ locale, code }: { locale: Locale; code: string }) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('delete-account.title')} preheader={t('delete-account.preheader')}>
      <Text>{t('delete-account.intro')}</Text>
      <CodeBox code={code} />
      <Text>{t('delete-account.effect')}</Text>
      <Text muted>{t('delete-account.expiry')}</Text>
      <Text muted>{t('delete-account.ignore')}</Text>
    </EmailLayout>
  );
};
