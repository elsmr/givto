import { RESEND_AFTER_SECONDS } from '@/components/auth/code-form';
import { useCooldown } from '@/components/auth/use-cooldown';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import type { EmailCodeError } from './use-email-code';

type EmailCodeFormProps = {
  email: string;
  busy: boolean;
  error: EmailCodeError | null;
  submitLabel: string;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onChangeEmail: () => void;
};

export const EmailCodeForm = ({
  email,
  busy,
  error,
  submitLabel,
  onVerify,
  onResend,
  onChangeEmail,
}: EmailCodeFormProps) => {
  const t = useTranslations('join.code');
  const tCheck = useTranslations('auth.check-email');
  const [otp, setOtp] = useState('');
  const [resent, setResent] = useState(false);
  const cooldown = useCooldown(RESEND_AFTER_SECONDS);

  useEffect(() => cooldown.start(), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setResent(false);
    onVerify(otp);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <p>{tCheck('sent', { email })}</p>
      <Field data-invalid={error ? 'true' : undefined}>
        <FieldLabel htmlFor="email-code">{tCheck('code-label')}</FieldLabel>
        <Input
          id="email-code"
          name="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby="email-code-help"
          className="max-w-48 text-2xl tracking-[0.3em]"
        />
        {error && <FieldError>{t(`errors.${error}`)}</FieldError>}
        {/* onResend reports nothing back: busy and error tell whether it went out. */}
        <p role="status" className="text-sm empty:hidden">
          {resent && !busy && !error && tCheck('resent')}
        </p>
        <FieldDescription id="email-code-help">{tCheck('spam')}</FieldDescription>
      </Field>
      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="neutral"
          disabled={busy || cooldown.secondsLeft > 0}
          onClick={() => {
            setResent(true);
            cooldown.start();
            onResend();
          }}
        >
          {cooldown.secondsLeft > 0 ? tCheck('resend-wait', { seconds: cooldown.secondsLeft }) : tCheck('resend')}
        </Button>
        <Button type="button" variant="ghost" onClick={onChangeEmail}>
          {tCheck('other-email')}
        </Button>
      </div>
    </form>
  );
};
