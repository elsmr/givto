import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { authClient, throwAuthError } from '@/lib/client/auth';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PasskeyItem } from './passkey-item';

export const PasskeyList = ({ email }: { email: string }) => {
  const t = useTranslations('account');
  const passkeys = authClient.useListPasskeys();
  const add = useMutation({
    // The name is what the device's passkey picker shows; it can be renamed here afterwards.
    mutationFn: () => throwAuthError(authClient.passkey.addPasskey({ name: email })),
    onSuccess: () => toast.add({ title: t('passkeys.added') }),
    onError: () => toast.add({ title: t('passkeys.add-failed'), type: 'error' }),
  });

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
      <Button className="self-start" onClick={() => add.mutate()} disabled={add.isPending}>
        {t('passkeys.add')}
      </Button>
    </>
  );
};
