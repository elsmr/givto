import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { MessageCircleQuestion } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { EditionInput } from './edition-input';
import { PsstNotice } from './psst-notice';
import { QuestionToAnswer } from './question-to-answer';

/** What your Santa sent you (and the people you look after): Psst!s and questions to answer. Nothing when there's none. */
export const ForYouSection = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.for-you');
  const trpc = useTRPC();
  const nudges = useQuery(trpc.nudge.forMe.queryOptions(input));
  const questions = useQuery(trpc.question.forMe.queryOptions(input));
  const nudgeList = nudges.data ?? [];
  const questionList = questions.data ?? [];

  if (nudgeList.length === 0 && questionList.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {nudgeList.map((nudge) => (
        <PsstNotice key={nudge.id} kind={nudge.kind} forName={nudge.forName} />
      ))}
      {questionList.length > 0 && (
        <Card>
          <CardHeader>
            <IconCardTitle icon={MessageCircleQuestion} tone="primary-muted">
              {t('questions-title')}
            </IconCardTitle>
            <CardDescription>{t('questions-intro')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-4">
              {questionList.map((question) => (
                <QuestionToAnswer key={question.id} input={input} question={question} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
