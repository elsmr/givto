import type { GroupEdition } from '@/components/group/group-data';
import { SettingsRow, settingsHelpId } from '@/components/ui/settings-group';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { useGuessError } from './use-guess-error';

/**
 * Organizer setting (62), on by default: it says plainly that Santas are shown at the turns, so
 * groups that want them secret for good know to switch it off.
 */
export const GuessSetting = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const t = useTranslations('guess.settings');
  const id = useId();
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
          queryClient.invalidateQueries(trpc.giftday.pathFilter()),
        ]),
    })
  );

  return (
    <SettingsRow label={t('switch')} description={t('description')} htmlFor={id}>
      <Switch
        id={id}
        aria-describedby={settingsHelpId(id)}
        checked={setEnabled.isPending ? setEnabled.variables.enabled : edition.guessing}
        disabled={setEnabled.isPending}
        onCheckedChange={(enabled) => setEnabled.mutate({ groupSlug, editionNumber: edition.number, enabled })}
      />
    </SettingsRow>
  );
};
