import { useRefreshEdition } from '@/components/draw/use-refresh-edition';
import type { GroupEdition } from '@/components/group/group-data';
import { SettingsRow, settingsHelpId } from '@/components/ui/settings-group';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { settingsErrorKey } from './settings-error';

/** "Not the same as last time", before the draw of an edition that has a previous one. */
export const AvoidPreviousSetting = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const t = useTranslations('settings');
  const id = useId();
  const trpc = useTRPC();
  const refresh = useRefreshEdition(groupSlug);
  const setAvoidPrevious = useMutation(
    trpc.settings.setAvoidPrevious.mutationOptions({
      onSuccess: () => toast.add({ title: t('saved'), type: 'success' }),
      onError: (error) => toast.add({ title: t(`errors.${settingsErrorKey(error)}`), type: 'error' }),
      onSettled: refresh,
    })
  );

  return (
    <SettingsRow label={t('avoid-previous.label')} description={t('avoid-previous.help')} htmlFor={id}>
      <Switch
        id={id}
        aria-describedby={settingsHelpId(id)}
        checked={setAvoidPrevious.isPending ? setAvoidPrevious.variables.enabled : edition.avoidPreviousGiftees}
        disabled={setAvoidPrevious.isPending}
        onCheckedChange={(enabled) => setAvoidPrevious.mutate({ groupSlug, editionNumber: edition.number, enabled })}
      />
    </SettingsRow>
  );
};
