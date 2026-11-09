import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { authClient } from '@/lib/client/auth';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PasskeyItem } from './passkey-item';

export const PasskeyList = ({ email }: { email: string }) => {
  const t = useTranslations('account');
  const passkeys = authClient.useListPasskeys();
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    // The name is what the device's passkey picker shows; it can be renamed here afterwards.
    const result = await authClient.passkey.addPasskey({ name: email });
    setBusy(false);
    if (result?.error) toast.add({ title: t('passkeys.add-failed'), type: 'error' });
    else toast.add({ title: t('passkeys.added') });
  };

  return (
    <>
      {passkeys.isPending ? (
        <Skeleton className="h-16" />
      ) : passkeys.data?.length ? (
        <ul className="flex flex-col gap-3">
          {passkeys.data.map((passkey) => (
            <PasskeyItem key={passkey.id} passkey={passkey} />
          ))}
        </ul>
      ) : (
        <p className="text-muted">{t('passkeys.empty')}</p>
      )}
      <Button className="self-start" onClick={add} disabled={busy}>
        {t('passkeys.add')}
      </Button>
    </>
  );
};
