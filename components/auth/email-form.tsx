import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { authClient, throwAuthError } from '@/lib/client/auth';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { authErrorKey } from './auth-error-key';

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
  const send = useMutation({
    mutationFn: (address: string) => throwAuthError(authClient.signIn.magicLink({ email: address, callbackURL })),
    onSuccess: (_, address) => onSent(address),
  });
  const error = send.error && authErrorKey(send.error);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate(email.trim());
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="sign-in-email">{t('email-label')}</FieldLabel>
        <Input
          id="sign-in-email"
          type="email"
          name="email"
          // `username` marks this as a sign-in form for password managers; `webauthn` offers passkeys here.
          autoComplete="username webauthn"
          autoFocus
          required
          value={email}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'sign-in-email-error' : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error && <FieldError id="sign-in-email-error">{t(`errors.${error}`)}</FieldError>}
      </Field>
      <Button type="submit" disabled={send.isPending}>
        {t('send')}
      </Button>
    </form>
  );
};
