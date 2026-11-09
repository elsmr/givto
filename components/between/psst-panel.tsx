import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import type { EditionInput } from './edition-input';
import { useBetweenError } from './use-between-error';

/** Psst! (30): ask your giftee for ideas, or for more detail once they have wishes. One per few days. */
export const PsstPanel = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.psst');
  const format = useFormatter();
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const status = useQuery(trpc.nudge.status.queryOptions(input));
  const send = useMutation(
    trpc.nudge.send.mutationOptions({
      onSuccess: () => toast.add({ title: t('sent', { name: status.data?.giftee.name ?? '' }), type: 'success' }),
      onError: (error) => toast.add({ title: errorMessage(error), type: 'error' }),
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.nudge.status.pathKey() }),
    })
  );

  if (!status.data) return null;
  const { giftee, kind, canNudge, answersOwnQuestions, nextAt } = status.data;

  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-lg font-bold">{t('title')}</h3>
      {answersOwnQuestions ? (
        <p>{t('unanswerable', { name: giftee.name })}</p>
      ) : (
        <>
          <p>{t(kind, { name: giftee.name })}</p>
          {nextAt ? (
            <p className="text-sm text-muted">{t('next', { date: format.dateTime(nextAt, { weekday: 'long', day: 'numeric', month: 'long' }) })}</p>
          ) : (
            canNudge && (
              <Button className="w-fit" disabled={send.isPending} onClick={() => send.mutate({ ...input, kind })}>
                {t('send')}
              </Button>
            )
          )}
        </>
      )}
    </section>
  );
};
