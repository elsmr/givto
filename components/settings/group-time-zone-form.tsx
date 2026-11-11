import { useInvalidateGroup } from '@/components/group/use-invalidate-group';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

/** The group's time zone (organizer only): gift day, reminders and scheduled draws follow it. */
export const GroupTimeZoneForm = ({ slug, timeZone }: { slug: string; timeZone: string }) => {
  const t = useTranslations('settings');
  const trpc = useTRPC();
  const invalidate = useInvalidateGroup(slug);
  const [value, setValue] = useState(timeZone);
  const save = useMutation(
    trpc.settings.setTimeZone.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('saved'), type: 'success' });
        void invalidate();
      },
    })
  );
  const zones = Intl.supportedValuesOf('timeZone');
  // The list leaves out valid aliases (UTC, Etc/GMT+1) and differs per browser.
  const options = zones.includes(timeZone) ? zones : [timeZone, ...zones];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ groupSlug: slug, timeZone: value });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="settings-time-zone">{t('time-zone.label')}</FieldLabel>
        <NativeSelect id="settings-time-zone" value={value} onChange={(event) => setValue(event.target.value)}>
          {options.map((zone) => (
            <NativeSelectOption key={zone} value={zone}>
              {zone}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>{t('time-zone.help')}</FieldDescription>
        {save.error && <FieldError>{t('errors.INTERNAL')}</FieldError>}
      </Field>
      <Button type="submit" className="self-start" disabled={save.isPending}>
        {t('save')}
      </Button>
    </form>
  );
};
