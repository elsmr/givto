import type { GroupEdition } from '@/components/group/group-data';
import { SettingsRow, settingsHelpId } from '@/components/ui/settings-group';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { useGiftDayError } from './use-gift-day-error';
import { useRefreshGiftDay } from './use-refresh-gift-day';

/** Organizer setting (31), off by default: off again hides the pairs from everyone. */
export const RevealSetting = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const t = useTranslations('giftday.reveal');
  const id = useId();
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
    <SettingsRow label={t('switch')} description={t('description')} htmlFor={id}>
      <Switch
        id={id}
        aria-describedby={settingsHelpId(id)}
        checked={setReveal.isPending ? setReveal.variables.enabled : edition.reveal}
        disabled={setReveal.isPending}
        onCheckedChange={(enabled) => setReveal.mutate({ groupSlug, editionNumber: edition.number, enabled })}
      />
    </SettingsRow>
  );
};
