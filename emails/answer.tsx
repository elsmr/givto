/** @jsxImportSource react */
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Quote } from './ui/quote';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

type AnswerProps = NoticeProps & { question: string; answer: string };

export const answerSubject = ({ locale }: Pick<NoticeProps, 'locale'>) => emailTranslator(locale)('answer.subject');

/** The giftee answered the Santa's question (52). Says "your giftee", like every email after the draw. */
export const AnswerEmail = ({ locale, group, url, forName, unsubscribe, question, answer }: AnswerProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('answer.title')} preheader={t('answer.preheader')} forName={forName} member unsubscribe={unsubscribe}>
      <Text>{t('answer.intro', { group })}</Text>
      <Quote>{question}</Quote>
      <Text>{t('answer.answer-label')}</Text>
      <Quote>{answer}</Quote>
      <Button href={url}>{t('answer.button')}</Button>
    </EmailLayout>
  );
};
