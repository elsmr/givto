import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { authClient } from '@/lib/client/auth';
import { useFocusAfterEdit } from '@/lib/client/use-focus-after-edit';
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
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<{ error: unknown }>, success?: string) => {
    setBusy(true);
    const { error } = await action();
    setBusy(false);
    if (error) toast.add({ title: t('errors.generic'), type: 'error' });
    else if (success) toast.add({ title: success });
    return !error;
  };

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    if (await run(() => authClient.passkey.updatePasskey({ id: passkey.id, name: value.trim() }))) setEditing(false);
  };

  if (editing) {
    return (
      <li className="flex flex-col gap-3 border-2 border-outline p-3">
        <form onSubmit={rename} className="flex flex-col gap-3 xs:flex-row">
          <Input
            aria-label={t('passkeys.rename-label', { name })}
            value={value}
            required
            maxLength={50}
            autoFocus
            onChange={(event) => setValue(event.target.value)}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>{t('passkeys.save')}</Button>
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
          disabled={busy}
          aria-label={t('passkeys.remove-label', { name })}
          onClick={() => run(() => authClient.passkey.deletePasskey({ id: passkey.id }), t('passkeys.removed'))}
        >
          {t('passkeys.remove')}
        </Button>
      </div>
    </li>
  );
};
