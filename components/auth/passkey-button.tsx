import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { authClient, throwAuthError } from '@/lib/client/auth';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export const PasskeyButton = ({ onSignedIn }: { onSignedIn: () => void }) => {
  const t = useTranslations('auth');
  const [failed, setFailed] = useState(false);
  const signIn = useMutation({
    mutationFn: () => throwAuthError(authClient.signIn.passkey()),
    onMutate: () => setFailed(false),
    onSuccess: onSignedIn,
  });

  // Passkeys in the email field's autofill (WebAuthn conditional mediation): pending until someone picks one. A click on
  // the button aborts it. Cancelled or unsupported comes back as a WebAuthn error code (ERROR_*) or AUTH_CANCELLED.
  useEffect(() => {
    void authClient.signIn.passkey({ autoFill: true }).then((result) => {
      const { error } = result ?? {};
      if (!error) onSignedIn();
      else if (!('code' in error) || (error.code !== 'AUTH_CANCELLED' && !error.code.startsWith('ERROR_'))) setFailed(true);
    });
    // Once, on mount; `onSignedIn` is a fresh closure every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="neutral" onClick={() => signIn.mutate()} disabled={signIn.isPending}>
        <KeyRound aria-hidden="true" />
        {t('passkey')}
      </Button>
      {(failed || signIn.isError) && <FieldError>{t('errors.passkey')}</FieldError>}
    </div>
  );
};
