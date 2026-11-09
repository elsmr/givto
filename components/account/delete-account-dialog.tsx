import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { authClient } from '@/lib/client/auth';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useState, type FormEvent } from 'react';

export const DeleteAccountDialog = ({ email }: { email: string }) => {
  const t = useTranslations('account');
  const router = useRouter();
  const trpc = useTRPC();
  const [code, setCode] = useState('');
  const requestCode = useMutation(trpc.account.requestDeletion.mutationOptions());
  const deleteAccount = useMutation(
    trpc.account.delete.mutationOptions({
      onSuccess: async () => {
        toast.add({ title: t('delete.deleted') });
        authClient.$store.notify('$sessionSignal');
        await router.push('/');
      },
    })
  );
  const error = requestCode.error ?? deleteAccount.error;
  const errorKey =
    error?.data?.appCode === 'RATE_LIMITED'
      ? 'errors.rate-limited'
      : error?.data?.appCode === 'INVALID_CODE' || error?.data?.appCode === 'INVALID_INPUT'
        ? 'delete.invalid-code'
        : 'errors.generic';

  const confirm = (event: FormEvent) => {
    event.preventDefault();
    deleteAccount.mutate({ code });
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="danger" className="self-start" />}>{t('delete.open')}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('delete.dialog-title')}</DialogTitle>
          <DialogDescription>{t('delete.dialog-description')}</DialogDescription>
        </DialogHeader>
        {requestCode.isSuccess ? (
          <form id="delete-account-form" onSubmit={confirm} className="flex flex-col gap-3">
            <p>{t('delete.code-sent', { email })}</p>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="delete-code">{t('delete.code-label')}</FieldLabel>
              <Input
                id="delete-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                className="max-w-48 font-mono text-2xl tracking-[0.3em]"
                value={code}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
              {error && <FieldError>{t(errorKey)}</FieldError>}
            </Field>
          </form>
        ) : (
          error && <FieldError>{t(errorKey)}</FieldError>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('delete.cancel')}</DialogClose>
          {requestCode.isSuccess ? (
            <Button type="submit" form="delete-account-form" variant="danger" disabled={deleteAccount.isPending || code.length !== 6}>
              {t('delete.confirm')}
            </Button>
          ) : (
            <Button variant="danger" onClick={() => requestCode.mutate()} disabled={requestCode.isPending}>
              {t('delete.send-code')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
