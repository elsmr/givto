import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AskQuestionForm } from './ask-question-form';
import type { EditionInput } from './edition-input';

/** Ask your giftee anonymously (52) and read their answers. */
export const SantaQuestions = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.ask');
  const trpc = useTRPC();
  const asked = useQuery(trpc.question.asked.queryOptions(input));

  if (!asked.data) return null;
  const { giftee, canAsk, answersOwnQuestions, questions } = asked.data;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-lg font-bold">{t('title', { name: giftee.name })}</h3>
      {answersOwnQuestions ? (
        <p>{t('unanswerable', { name: giftee.name })}</p>
      ) : (
        <>
          <p className="text-sm text-muted">{t('intro', { name: giftee.name })}</p>
          {canAsk && <AskQuestionForm input={input} gifteeName={giftee.name} />}
        </>
      )}
      {questions.length > 0 && (
        <>
          <h4 className="font-bold">{t('asked-title')}</h4>
          <ul className="flex flex-col gap-3">
            {questions.map((question) => (
              <li key={question.id} className="flex flex-col gap-1 border-l-4 border-primary pl-3">
                <p className="font-semibold break-words whitespace-pre-line">{question.text}</p>
                {question.answer ? (
                  <p className="break-words whitespace-pre-line">
                    <span className="font-semibold">{t('answer-label')}: </span>
                    {question.answer.text}
                  </p>
                ) : (
                  <p className="text-sm text-muted">{t('waiting')}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};
