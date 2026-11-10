import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
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
  const [otp, setOtp] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onVerify(otp);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <p>{t('sent', { email })}</p>
      <Field data-invalid={error ? 'true' : undefined}>
        <FieldLabel htmlFor="email-code">{t('label')}</FieldLabel>
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
        <FieldDescription id="email-code-help">{t('help')}</FieldDescription>
        {error && <FieldError>{t(`errors.${error}`)}</FieldError>}
      </Field>
      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        <Button type="button" variant="neutral" disabled={busy} onClick={onResend}>
          {t('resend')}
        </Button>
        <Button type="button" variant="ghost" onClick={onChangeEmail}>
          {t('change-email')}
        </Button>
      </div>
    </form>
  );
};
