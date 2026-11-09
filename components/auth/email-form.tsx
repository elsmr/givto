import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/client/auth';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { authErrorKey, type AuthErrorKey } from './auth-error-key';

/** Sends the sign-in email (code + link); `onSent` gets the address. */
export const EmailForm = ({
  callbackURL,
  onSent,
}: {
  callbackURL: string;
  onSent: (email: string) => void;
}) => {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const address = email.trim();
    const result = await authClient.signIn.magicLink({ email: address, callbackURL });
    setBusy(false);
    if (result.error) setError(authErrorKey(result.error));
    else onSent(address);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="sign-in-email">{t('email-label')}</FieldLabel>
        <Input
          id="sign-in-email"
          type="email"
          name="email"
          autoComplete="email webauthn"
          required
          value={email}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'sign-in-email-error' : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && <FieldError id="sign-in-email-error">{t(`errors.${error}`)}</FieldError>}
      </Field>
      <Button type="submit" disabled={busy}>
        {t('send')}
      </Button>
    </form>
  );
};
