import { FieldSeparator } from '@/components/ui/field';
import { authClient } from '@/lib/client/auth';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { CodeForm } from './code-form';
import { EmailForm } from './email-form';
import { PasskeyButton } from './passkey-button';

/** Email → code (or the emailed link), or a passkey; then on to `redirect` (a same-origin path). */
export const SignInFlow = ({ redirect }: { redirect: string }) => {
  const t = useTranslations('auth');
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  const done = async () => {
    // The session store only refreshes itself after some sign-in paths.
    authClient.$store.notify('$sessionSignal');
    await router.replace(redirect);
  };

  if (email) {
    return (
      <section aria-labelledby="check-email-title" className="flex flex-col gap-4">
        <h2 id="check-email-title" className="text-2xl font-bold">
          {t('check-email.title')}
        </h2>
        <CodeForm email={email} callbackURL={redirect} onSignedIn={done} onBack={() => setEmail(null)} />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <EmailForm callbackURL={redirect} onSent={setEmail} />
      <FieldSeparator>{t('or')}</FieldSeparator>
      <PasskeyButton onSignedIn={done} />
    </div>
  );
};
