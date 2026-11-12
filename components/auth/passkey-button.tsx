import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { authClient } from '@/lib/client/auth';
import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export const PasskeyButton = ({ onSignedIn }: { onSignedIn: () => void }) => {
  const t = useTranslations('auth');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

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

  const signIn = async () => {
    setBusy(true);
    setFailed(false);
    const result = await authClient.signIn.passkey();
    setBusy(false);
    if (result?.error) setFailed(true);
    else onSignedIn();
  };

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="neutral" onClick={signIn} disabled={busy}>
        <KeyRound aria-hidden="true" />
        {t('passkey')}
      </Button>
      {failed && <FieldError>{t('errors.passkey')}</FieldError>}
    </div>
  );
};
