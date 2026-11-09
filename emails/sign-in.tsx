/** @jsxImportSource react */
import type { Locale } from '../lib/schema/common';
import { Button } from './ui/button';
import { CodeBox } from './ui/code-box';
import { EmailLayout } from './ui/layout';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

export const signInSubject = (locale: Locale) => emailTranslator(locale)('sign-in.subject');

export const SignInEmail = ({ locale, otp, url }: { locale: Locale; otp: string; url: string }) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('sign-in.title')} preheader={t('sign-in.preheader', { otp })}>
      <Text>{t('sign-in.code')}</Text>
      <CodeBox code={otp} />
      <Text>{t('sign-in.link')}</Text>
      <Button href={url}>{t('sign-in.button')}</Button>
      <Text muted>{t('sign-in.expiry')}</Text>
      <Text muted>{t('sign-in.ignore')}</Text>
    </EmailLayout>
  );
};
