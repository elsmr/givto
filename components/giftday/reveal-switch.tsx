import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { useGiftDayError } from './use-gift-day-error';
import { useRefreshGiftDay } from './use-refresh-gift-day';

type RevealSwitchProps = { groupSlug: string; editionNumber: number; enabled: boolean };

/** Organizer: the big reveal on or off (off by default; off again hides it from everyone). */
export const RevealSwitch = ({ groupSlug, editionNumber, enabled }: RevealSwitchProps) => {
  const t = useTranslations('giftday.reveal');
  const id = useId();
  const trpc = useTRPC();
  const refresh = useRefreshGiftDay();
  const onError = useGiftDayError();
  const setReveal = useMutation(trpc.giftday.setReveal.mutationOptions({ onSettled: refresh, onError }));

  return (
    <Field orientation="horizontal" className="w-fit">
      <Switch
        id={id}
        checked={setReveal.isPending ? setReveal.variables.enabled : enabled}
        disabled={setReveal.isPending}
        onCheckedChange={(next) => setReveal.mutate({ groupSlug, editionNumber, enabled: next })}
      />
      <FieldLabel htmlFor={id}>{t('switch')}</FieldLabel>
    </Field>
  );
};
