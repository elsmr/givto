import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { SettingsRow, settingsHelpId } from '@/components/ui/settings-group';
import { useTRPC } from '@/lib/client/trpc';
import type { UnwrapMode } from '@/lib/schema/edition';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { useGiftDayError } from './use-gift-day-error';
import { useRefreshGiftDay } from './use-refresh-gift-day';

const modes: UnwrapMode[] = ['allAtOnce', 'oneByOne'];

type UnwrapModeSelectProps = { groupSlug: string; editionNumber: number; mode: UnwrapMode; inProgress: boolean };

/** Organizer: all at once (default) or one by one. Changing it starts the unwrapping over, so mid-way it asks first. */
export const UnwrapModeSetting = ({ groupSlug, editionNumber, mode, inProgress }: UnwrapModeSelectProps) => {
  const t = useTranslations('giftday.order');
  const id = useId();
  const trpc = useTRPC();
  const refresh = useRefreshGiftDay();
  const onError = useGiftDayError();
  const select = useRef<HTMLSelectElement>(null);
  const [confirming, setConfirming] = useState<UnwrapMode | null>(null);
  const setMode = useMutation(
    trpc.giftday.setMode.mutationOptions({ onSuccess: () => setConfirming(null), onSettled: refresh, onError })
  );
  const shown = setMode.isPending ? setMode.variables.mode : mode;
  const change = (next: UnwrapMode) => setMode.mutate({ groupSlug, editionNumber, mode: next });

  return (
    <SettingsRow label={t('mode-label')} description={t(`mode-help.${shown}`)} htmlFor={id}>
      <NativeSelect
        ref={select}
        id={id}
        aria-describedby={settingsHelpId(id)}
        value={shown}
        onChange={(event) => {
          const next = event.target.value as UnwrapMode;
          if (inProgress) setConfirming(next);
          else change(next);
        }}
      >
        {modes.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {t(`modes.${option}`)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent finalFocus={select}>
          <DialogHeader>
            <DialogTitle>{t('mode-restart-title')}</DialogTitle>
            <DialogDescription>{t('mode-restart-description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="neutral" />}>{t('mode-restart-cancel')}</DialogClose>
            <Button disabled={setMode.isPending} onClick={() => confirming && change(confirming)}>
              {t('mode-restart-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsRow>
  );
};
