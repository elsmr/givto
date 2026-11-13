import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC, type RouterOutputs } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import type { EditionInput } from './edition-input';
import { useBetweenError } from './use-between-error';

type QuestionForMe = RouterOutputs['question']['forMe'][number];

/** A question from "your Santa" (no name) with an answer form, or the answer once sent. */
export const QuestionToAnswer = ({ input, question }: { input: EditionInput; question: QuestionForMe }) => {
  const t = useTranslations('between.for-you');
  const id = useId();
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const answer = useMutation(
    trpc.question.answer.mutationOptions({
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.question.forMe.pathKey() }),
    })
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    answer.mutate({ ...input, questionId: question.id, text });
  };

  return (
    <li className="flex flex-col gap-3 border-l-4 border-primary pl-3">
      {question.forName && <span className="text-sm font-semibold text-muted">{t('question-for', { name: question.forName })}</span>}
      <p className="text-lg font-semibold break-words whitespace-pre-line">{question.text}</p>
      {question.answer ? (
        <p className="break-words whitespace-pre-line">
          <span className="font-semibold">{t('answered')}: </span>
          {question.answer.text}
        </p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor={id}>{t('answer')}</FieldLabel>
            <Textarea
              id={id}
              required
              maxLength={1000}
              className="min-h-16"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>
          {answer.error && <Alert variant="danger">{errorMessage(answer.error)}</Alert>}
          <Button type="submit" className="w-fit" disabled={answer.isPending}>
            {t('answer-submit')}
          </Button>
        </form>
      )}
    </li>
  );
};
