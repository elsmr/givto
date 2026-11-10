import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { authClient } from '@/lib/client/auth';
import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export const PasskeyButton = ({ onSignedIn }: { onSignedIn: () => void }) => {
  const t = useTranslations('auth');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

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
