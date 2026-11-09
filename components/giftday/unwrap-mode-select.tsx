import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { useTRPC } from '@/lib/client/trpc';
import type { UnwrapMode } from '@/lib/schema/edition';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { useGiftDayError } from './use-gift-day-error';
import { useRefreshGiftDay } from './use-refresh-gift-day';

const modes: UnwrapMode[] = ['allAtOnce', 'oneByOne'];

type UnwrapModeSelectProps = { groupSlug: string; editionNumber: number; mode: UnwrapMode; locked: boolean };

/** Organizer: all at once (default) or one by one. Locked while the unwrapping is under way. */
export const UnwrapModeSelect = ({ groupSlug, editionNumber, mode, locked }: UnwrapModeSelectProps) => {
  const t = useTranslations('giftday.order');
  const id = useId();
  const trpc = useTRPC();
  const refresh = useRefreshGiftDay();
  const onError = useGiftDayError();
  const setMode = useMutation(trpc.giftday.setMode.mutationOptions({ onSettled: refresh, onError }));
  const shown = setMode.isPending ? setMode.variables.mode : mode;

  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor={id}>{t('mode-label')}</FieldLabel>
      <NativeSelect
        id={id}
        value={shown}
        disabled={locked || setMode.isPending}
        onChange={(event) => setMode.mutate({ groupSlug, editionNumber, mode: event.target.value as UnwrapMode })}
      >
        {modes.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {t(`modes.${option}`)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldDescription>{locked ? t('mode-locked') : t(`mode-help.${shown}`)}</FieldDescription>
    </Field>
  );
};
