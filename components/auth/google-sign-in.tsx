import { Button } from '@/components/ui/button';
import { FieldError, FieldSeparator } from '@/components/ui/field';
import { authClient } from '@/lib/client/auth';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useState } from 'react';

export const googleSignInEnabled = process.env.GOOGLE_SIGN_IN === '1';

/** Better Auth's `?error=` after coming back from Google; cancelling there isn't one. */
export const googleError = (error: unknown) => (typeof error === 'string' && error !== 'access_denied' ? error : null);

/** Google's "G", in its brand colours (required on a sign-in-with-Google button). */
export const GoogleLogo = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

type GoogleSignInProps = {
  callbackURL: string;
  /** Where a failure comes back to, as `?error=`: the page with this button. */
  errorCallbackURL?: string;
  separator?: boolean;
};

/** "Continue with Google", back to `callbackURL` signed in. Nothing when Google isn't configured. */
export const GoogleSignIn = ({ callbackURL, errorCallbackURL, separator = true }: GoogleSignInProps) => {
  const t = useTranslations('auth');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!googleSignInEnabled) return null;

  const signIn = async () => {
    setBusy(true);
    setFailed(false);
    // On success the browser is already on its way to Google: stay busy.
    const { error } = await authClient.signIn.social({ provider: 'google', callbackURL, errorCallbackURL: errorCallbackURL ?? router.asPath });
    if (error) {
      setBusy(false);
      setFailed(true);
    }
  };

  return (
    <>
      {separator && (
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-surface [&_[role=separator]]:border-dashed">
          {t('or')}
        </FieldSeparator>
      )}
      <div className="flex flex-col gap-2">
        <Button type="button" variant="neutral" onClick={signIn} disabled={busy}>
          <GoogleLogo />
          {t('google')}
        </Button>
        {(failed || googleError(router.query.error)) && <FieldError>{t('errors.google')}</FieldError>}
      </div>
    </>
  );
};
