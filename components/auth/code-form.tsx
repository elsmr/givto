import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient, throwAuthError } from '@/lib/client/auth';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import { authErrorKey } from './auth-error-key';
import { useCooldown } from './use-cooldown';

export const RESEND_AFTER_SECONDS = 60;

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
  const cooldown = useCooldown(RESEND_AFTER_SECONDS);
  const verify = useMutation({
    mutationFn: () => throwAuthError(authClient.signIn.emailOtp({ email, otp: otp.trim() })),
    onSuccess: onSignedIn,
  });
  const resend = useMutation({
    mutationFn: () => throwAuthError(authClient.signIn.magicLink({ email, callbackURL })),
    onMutate: () => {
      verify.reset();
      cooldown.start();
    },
    onSuccess: () => setOtp(''),
  });
  const failed = verify.error ?? resend.error;
  const error = failed && authErrorKey(failed);

  useEffect(() => cooldown.start(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    resend.reset();
    verify.mutate();
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
            className="mono max-w-48 text-2xl tracking-[0.3em]"
            value={otp}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'sign-in-code-error sign-in-code-hint' : 'sign-in-code-hint'}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
          />
          {error && <FieldError id="sign-in-code-error">{t(`errors.${error}`)}</FieldError>}
          <p role="status" className="text-sm empty:hidden">
            {resend.isSuccess && t('check-email.resent')}
          </p>
          <FieldDescription id="sign-in-code-hint">{t('check-email.spam')}</FieldDescription>
        </Field>
        <Button type="submit" disabled={verify.isPending || otp.length !== 6}>
          {t('check-email.submit')}
        </Button>
      </form>
      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
        <Button type="button" variant="neutral" onClick={() => resend.mutate()} disabled={cooldown.secondsLeft > 0}>
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
