import { appErrorCode } from '@/components/group/app-error-code';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { authClient } from '@/lib/client/auth';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

export const NameForm = ({ name, email }: { name: string; email: string }) => {
  const t = useTranslations('account');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(name);
  const setName = useMutation(
    trpc.account.setName.mutationOptions({
      onSuccess: async () => {
        toast.add({ title: t('profile.saved') });
        authClient.$store.notify('$sessionSignal');
        await queryClient.invalidateQueries({ queryKey: trpc.account.get.queryKey() });
      },
    })
  );
  const invalid = appErrorCode(setName.error) === 'INVALID_INPUT';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setName.mutate({ name: value });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor="account-name">{t('profile.name-label')}</FieldLabel>
        <Input
          id="account-name"
          name="name"
          autoComplete="name"
          required
          maxLength={50}
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={setName.error ? 'account-name-error' : undefined}
          onChange={(event) => setValue(event.target.value)}
        />
        {setName.error && (
          <FieldError id="account-name-error">{invalid ? t('profile.invalid') : t('errors.generic')}</FieldError>
        )}
      </Field>
      <Field>
        <FieldLabel htmlFor="account-email">{t('profile.email-label')}</FieldLabel>
        <Input id="account-email" type="email" value={email} readOnly disabled />
      </Field>
      <Button type="submit" className="self-start" disabled={setName.isPending}>
        {t('profile.save')}
      </Button>
    </form>
  );
};
