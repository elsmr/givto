import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { MessageCircleQuestion } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AskQuestionForm } from './ask-question-form';
import type { EditionInput } from './edition-input';

/** Ask your giftee anonymously (52), in a dialog. Nothing when asking is off. */
export const AskQuestionButton = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.ask');
  const trpc = useTRPC();
  const asked = useQuery(trpc.question.asked.queryOptions(input));
  const [open, setOpen] = useState(false);

  if (!asked.data || asked.data.answersOwnQuestions || !asked.data.canAsk) return null;
  const { giftee } = asked.data;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="neutral" size="sm" />}>
        <MessageCircleQuestion aria-hidden="true" />
        {t('button')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title', { name: giftee.name })}</DialogTitle>
          <DialogDescription>{t('intro', { name: giftee.name })}</DialogDescription>
        </DialogHeader>
        <AskQuestionForm input={input} gifteeName={giftee.name} onSent={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};

/** The questions you asked your giftee and their answers. Nothing until you've asked one. */
export const SantaQuestions = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.ask');
  const trpc = useTRPC();
  const questions = useQuery(trpc.question.asked.queryOptions(input)).data?.questions ?? [];

  if (questions.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-lg font-bold">{t('asked-title')}</h3>
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
    </section>
  );
};
