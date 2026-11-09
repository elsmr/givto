import { useRouter } from 'next/router';
import { useState, type FormEvent } from 'react';
import { authClient, safeRedirect } from '../../lib/client/auth';

// Functional and unstyled on purpose; the sign-in slice restyles and translates it.
export default function SignInPage() {
  const router = useRouter();
  const redirect = safeRedirect(router.query.redirect);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const linkError = typeof router.query.error === 'string' ? router.query.error : null;

  const run = async (action: () => Promise<{ error: { message?: string } | null }>, onSuccess: () => void) => {
    setBusy(true);
    setError(null);
    const { error } = await action();
    setBusy(false);
    if (error) setError(error.message ?? 'Something went wrong');
    else onSuccess();
  };

  const sendEmail = (event: FormEvent) => {
    event.preventDefault();
    const errorCallbackURL = `/auth/sign-in?redirect=${encodeURIComponent(redirect)}`;
    void run(
      () => authClient.signIn.magicLink({ email, callbackURL: redirect, errorCallbackURL }),
      () => setStep('code')
    );
  };

  const verifyCode = (event: FormEvent) => {
    event.preventDefault();
    void run(
      () => authClient.signIn.emailOtp({ email, otp }),
      () => void router.replace(redirect)
    );
  };

  const signInWithPasskey = () =>
    void run(
      () => authClient.signIn.passkey(),
      () => void router.replace(redirect)
    );

  return (
    <main>
      <h1>Sign in</h1>
      {linkError && <p role="alert">That sign-in link didn’t work ({linkError}). Request a new one.</p>}
      {step === 'email' ? (
        <form onSubmit={sendEmail}>
          <label>
            Email <input type="email" name="email" autoComplete="email webauthn" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" disabled={busy}>Email me a code</button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <p>We sent a code and a sign-in link to {email}. Enter the code, or click the link in the email.</p>
          <label>
            Code <input name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} />
          </label>
          <button type="submit" disabled={busy}>Sign in</button>
          <button type="button" onClick={() => setStep('email')}>Use another email</button>
        </form>
      )}
      <p>
        <button type="button" onClick={signInWithPasskey} disabled={busy}>Sign in with a passkey</button>
      </p>
      {error && <p role="alert">{error}</p>}
    </main>
  );
}
