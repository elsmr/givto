import type { GroupEdition } from '@/components/group/group-data';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { useGuessError } from './use-guess-error';

/**
 * Organizer setting (62), on by default: it says plainly that Santas are shown at the turns, so
 * groups that want them secret for good know to switch it off.
 */
export const GuessSettings = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const t = useTranslations('guess.settings');
  const id = useId();
  const descriptionId = useId();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const onError = useGuessError();
  const setEnabled = useMutation(
    trpc.guess.setEnabled.mutationOptions({
      onSuccess: (_, { enabled }) => toast.add({ title: enabled ? t('on') : t('off'), type: 'success' }),
      onError,
      onSettled: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.group.get.queryKey({ groupSlug }) }),
          queryClient.invalidateQueries(trpc.guess.mine.pathFilter()),
          queryClient.invalidateQueries(trpc.giftday.get.pathFilter()),
        ]),
    })
  );

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={VenetianMask} tone="primary-muted">
          {t('title')}
        </IconCardTitle>
        <CardDescription id={descriptionId}>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Field orientation="horizontal" className="w-fit">
          <Switch
            id={id}
            aria-describedby={descriptionId}
            checked={setEnabled.isPending ? setEnabled.variables.enabled : edition.guessing}
            disabled={setEnabled.isPending}
            onCheckedChange={(enabled) => setEnabled.mutate({ groupSlug, editionNumber: edition.number, enabled })}
          />
          <FieldLabel htmlFor={id}>{t('switch')}</FieldLabel>
        </Field>
      </CardContent>
    </Card>
  );
};
