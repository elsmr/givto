import { FieldSeparator } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { authClient } from '@/lib/client/auth';
import { MailCheck } from 'lucide-react';
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
      <div className="flex flex-col gap-4">
        <IconCardTitle icon={MailCheck} tone="yellow">
          {t('check-email.title')}
        </IconCardTitle>
        <CodeForm email={email} callbackURL={redirect} onSignedIn={done} onBack={() => setEmail(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <EmailForm callbackURL={redirect} onSent={setEmail} />
      {/* The label sits on the card, not the page. */}
      <FieldSeparator className="*:data-[slot=field-separator-content]:bg-surface [&_[role=separator]]:border-dashed">
        {t('or')}
      </FieldSeparator>
      <PasskeyButton onSignedIn={done} />
    </div>
  );
};
