/** @jsxImportSource react */
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Quote } from './ui/quote';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

export const questionSubject = ({ locale }: Pick<NoticeProps, 'locale'>) => emailTranslator(locale)('question.subject');

/** An anonymous question from the Santa (52), sent at the question's delivery time. */
export const QuestionEmail = ({ locale, group, url, forName, unsubscribe, question }: NoticeProps & { question: string }) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('question.title')} preheader={t('question.preheader')} forName={forName} member unsubscribe={unsubscribe}>
      <Text>{t('question.intro', { group })}</Text>
      <Quote>{question}</Quote>
      <Text muted>{t('question.secret')}</Text>
      <Button href={url}>{t('question.button')}</Button>
    </EmailLayout>
  );
};
