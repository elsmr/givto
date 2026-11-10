import type { GroupEdition } from '@/components/group/group-data';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { useGiftDayError } from './use-gift-day-error';
import { useRefreshGiftDay } from './use-refresh-gift-day';

/** Organizer setting (31), off by default: off again hides the pairs from everyone. */
export const RevealSettings = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const t = useTranslations('giftday.reveal');
  const id = useId();
  const descriptionId = useId();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const refresh = useRefreshGiftDay();
  const onError = useGiftDayError();
  const setReveal = useMutation(
    trpc.giftday.setReveal.mutationOptions({
      onSuccess: (_, { enabled }) => toast.add({ title: enabled ? t('on') : t('off'), type: 'success' }),
      onError,
      onSettled: () =>
        Promise.all([queryClient.invalidateQueries({ queryKey: trpc.group.get.queryKey({ groupSlug }) }), refresh()]),
    })
  );

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Sparkles} tone="primary-muted">
          {t('title')}
        </IconCardTitle>
        <CardDescription id={descriptionId}>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Field orientation="horizontal" className="w-fit">
          <Switch
            id={id}
            aria-describedby={descriptionId}
            checked={setReveal.isPending ? setReveal.variables.enabled : edition.reveal}
            disabled={setReveal.isPending}
            onCheckedChange={(enabled) => setReveal.mutate({ groupSlug, editionNumber: edition.number, enabled })}
          />
          <FieldLabel htmlFor={id}>{t('switch')}</FieldLabel>
        </Field>
      </CardContent>
    </Card>
  );
};
