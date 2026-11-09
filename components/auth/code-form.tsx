import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/client/auth';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import { authErrorKey, type AuthErrorKey } from './auth-error-key';
import { useCooldown } from './use-cooldown';

const RESEND_AFTER_SECONDS = 60;

/** Step two: the emailed code, with resend (after a cooldown) and "use another email". */
export const CodeForm = ({
  email,
  callbackURL,
  onSignedIn,
  onBack,
}: {
  email: string;
  callbackURL: string;
  onSignedIn: () => void;
  onBack: () => void;
}) => {
  const t = useTranslations('auth');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [resent, setResent] = useState(false);
  const cooldown = useCooldown(RESEND_AFTER_SECONDS);

  useEffect(() => cooldown.start(), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authClient.signIn.emailOtp({ email, otp: otp.trim() });
    setBusy(false);
    if (result.error) setError(authErrorKey(result.error));
    else onSignedIn();
  };

  const resend = async () => {
    setError(null);
    setResent(false);
    cooldown.start();
    const result = await authClient.signIn.magicLink({ email, callbackURL });
    if (result.error) setError(authErrorKey(result.error));
    else {
      setOtp('');
      setResent(true);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <p>{t('check-email.sent', { email })}</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="sign-in-code">{t('check-email.code-label')}</FieldLabel>
          <Input
            id="sign-in-code"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            className="max-w-48 font-mono text-2xl tracking-[0.3em]"
            value={otp}
            aria-invalid={error ? true : undefined}
            aria-describedby="sign-in-code-hint"
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
          />
          {error && <FieldError>{t(`errors.${error}`)}</FieldError>}
          {resent && <p role="status" className="text-sm">{t('check-email.resent')}</p>}
          <FieldDescription id="sign-in-code-hint">{t('check-email.spam')}</FieldDescription>
        </Field>
        <Button type="submit" disabled={busy || otp.length !== 6}>
          {t('check-email.submit')}
        </Button>
      </form>
      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
        <Button type="button" variant="neutral" onClick={resend} disabled={cooldown.secondsLeft > 0}>
          {cooldown.secondsLeft > 0
            ? t('check-email.resend-wait', { seconds: cooldown.secondsLeft })
            : t('check-email.resend')}
        </Button>
        <Button type="button" variant="ghost" onClick={onBack}>
          {t('check-email.other-email')}
        </Button>
      </div>
    </div>
  );
};
