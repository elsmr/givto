import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { authClient, throwAuthError } from '@/lib/client/auth';
import { useFocusAfterEdit } from '@/lib/client/use-focus-after-edit';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

export interface PasskeySummary {
  id: string;
  name?: string | null;
  createdAt: Date | string;
}

export const PasskeyItem = ({ passkey }: { passkey: PasskeySummary }) => {
  const t = useTranslations('account');
  const format = useFormatter();
  const name = passkey.name || t('passkeys.unnamed');
  const [editing, setEditing] = useState(false);
  const editButton = useFocusAfterEdit(editing);
  const [value, setValue] = useState(name);
  const failed = () => toast.add({ title: t('errors.generic'), type: 'error' });
  const rename = useMutation({
    mutationFn: () => throwAuthError(authClient.passkey.updatePasskey({ id: passkey.id, name: value.trim() })),
    onSuccess: () => setEditing(false),
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: () => throwAuthError(authClient.passkey.deletePasskey({ id: passkey.id })),
    onSuccess: () => toast.add({ title: t('passkeys.removed') }),
    onError: failed,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    rename.mutate();
  };

  if (editing) {
    return (
      <li className="flex flex-col gap-3 border-2 border-outline p-3">
        <form onSubmit={submit} className="flex flex-col gap-3 xs:flex-row">
          <Input
            aria-label={t('passkeys.rename-label', { name })}
            value={value}
            required
            maxLength={50}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={rename.isPending}>{t('passkeys.save')}</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>{t('passkeys.cancel')}</Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 border-2 border-outline p-3 xs:flex-row xs:items-center">
      <KeyRound aria-hidden="true" className="hidden size-5 shrink-0 xs:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">{name}</span>
        <span className="text-sm text-muted">
          {t('passkeys.added-on', { date: format.dateTime(new Date(passkey.createdAt), { dateStyle: 'medium' }) })}
        </span>
      </div>
      <div className="flex gap-3">
        <Button ref={editButton} variant="neutral" onClick={() => setEditing(true)} aria-label={`${t('passkeys.rename')}: ${name}`}>
          {t('passkeys.rename')}
        </Button>
        <Button
          variant="danger"
          disabled={remove.isPending}
          aria-label={t('passkeys.remove-label', { name })}
          onClick={() => remove.mutate()}
        >
          {t('passkeys.remove')}
        </Button>
      </div>
    </li>
  );
};
