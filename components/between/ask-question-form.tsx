import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import type { EditionInput } from './edition-input';
import { useBetweenError } from './use-between-error';

/** One question to the giftee, sent anonymously. */
export const AskQuestionForm = ({ input, gifteeName }: { input: EditionInput; gifteeName: string }) => {
  const t = useTranslations('between.ask');
  const id = useId();
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const ask = useMutation(
    trpc.question.ask.mutationOptions({
      onSuccess: () => {
        setText('');
        toast.add({ title: t('sent', { name: gifteeName }), type: 'success' });
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.question.asked.pathKey() }),
    })
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask.mutate({ ...input, text });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor={id}>{t('text')}</FieldLabel>
        <Textarea
          id={id}
          required
          maxLength={500}
          className="min-h-16"
          placeholder={t('placeholder')}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      {ask.error && <Alert variant="danger">{errorMessage(ask.error)}</Alert>}
      <Button type="submit" variant="neutral" className="w-fit" disabled={ask.isPending}>
        {t('submit')}
      </Button>
    </form>
  );
};
