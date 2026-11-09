import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { AuthoredTip } from './authored-tip';
import type { EditionInput } from './edition-input';
import { TipForm } from './tip-form';
import { useBetweenError } from './use-between-error';

const emptyTip = { aboutMemberId: '', text: '', anonymous: false };

/** "Tips for someone's Santa" (42): leave a tip about anyone in the draw, and manage your own tips. */
export const TipsAboutPeople = ({ input }: { input: EditionInput }) => {
  const t = useTranslations('between.tips');
  const errorMessage = useBetweenError();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const authored = useQuery(trpc.tip.authored.queryOptions(input));
  // A new key empties the form after a tip is saved.
  const [formKey, setFormKey] = useState(0);
  const create = useMutation(
    trpc.tip.create.mutationOptions({
      onSuccess: (tip) => {
        toast.add({ title: t('added', { name: tip.aboutName }), type: 'success' });
        setFormKey((key) => key + 1);
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.tip.pathKey() }),
    })
  );

  if (authored.isPending) return <Skeleton className="h-64" />;
  if (!authored.data) return null;
  const { canWrite, people, tips } = authored.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription>{t('intro')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!canWrite ? (
          <p>{t('closed')}</p>
        ) : people.length === 0 ? (
          <p>{t('nobody')}</p>
        ) : (
          <TipForm
            key={formKey}
            initial={emptyTip}
            people={people}
            submitLabel={t('add')}
            busy={create.isPending}
            error={create.error ? errorMessage(create.error) : undefined}
            onSubmit={(draft) => create.mutate({ ...input, ...draft })}
          />
        )}
        {tips.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="font-heading text-lg font-bold">{t('mine-title')}</h3>
            <ul className="flex flex-col gap-3">
              {tips.map((tip) => (
                <AuthoredTip key={tip.id} input={input} tip={tip} canEdit={canWrite} />
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
};
