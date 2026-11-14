import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { authClient } from '@/lib/client/auth';
import { useTRPC } from '@/lib/client/trpc';
import type { JoinPreview } from '@/lib/server/join-preview';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { appErrorCode, knownAppError } from '../group/app-error-code';
import { EmailCodeForm } from './email-code-form';
import { GoogleSignIn } from '../auth/google-sign-in';
import { JoinIntro } from './join-intro';
import { JoinRequested } from './join-requested';
import { NameEmailForm } from './name-email-form';
import { useEmailCode } from './use-email-code';

const knownErrors = ['GROUP_FULL', 'JOIN_LINK_INVALID', 'RATE_LIMITED', 'INVALID_INPUT'] as const;

type JoinFlowProps = { slug: string; token: string; preview: JoinPreview };

/** Join via the group link (45): email → emailed code → member (or waiting for approval); the name only for an account without one. */
export const JoinFlow = ({ slug, token, preview }: JoinFlowProps) => {
  const t = useTranslations('join');
  const trpc = useTRPC();
  const router = useRouter();
  const session = authClient.useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'details' | 'code'>('details');
  const emailCode = useEmailCode(router.asPath);
  const accept = useMutation(
    trpc.join.accept.mutationOptions({
      onSuccess: ({ status }) => {
        void session.refetch();
        if (status === 'joined') void router.push(`/g/${slug}`);
      },
      // Just verified: make sure the form sees the signed-in account it now asks the name for.
      onError: (error) => {
        if (appErrorCode(error) === 'NAME_REQUIRED') void session.refetch();
      },
    })
  );

  if (session.isPending) return <LogoAnimation variant="loading" />;
  if (accept.data?.status === 'requested') return <JoinRequested organizer={preview.organizerFirstName} />;

  const signedInEmail = session.data?.user.email ?? null;
  const askName = signedInEmail !== null && !session.data?.user.name;
  const join = () => accept.mutate({ groupSlug: slug, token, ...(askName && { name }) });
  const sendCode = async () => {
    if (await emailCode.send(email)) setStep('code');
  };
  const verify = async (otp: string) => {
    if (!(await emailCode.verify(email, otp))) return;
    setStep('details');
    join();
  };
  const errorCode = accept.error && appErrorCode(accept.error) !== 'NAME_REQUIRED' && knownAppError(accept.error, knownErrors);

  return (
    <JoinIntro preview={preview}>
      {errorCode && (
        <Alert variant="danger">
          <AlertDescription>{t(`errors.${errorCode}`)}</AlertDescription>
        </Alert>
      )}
      {step === 'details' ? (
        <NameEmailForm
          texts={{
            name: t('details.name'),
            nameHelp: t('details.name-help'),
            email: t('details.email'),
            emailHelp: t('details.email-help'),
            signedIn: t('details.signed-in', { email: signedInEmail ?? '' }),
            submit: signedInEmail ? t('details.join') : t('details.send-code'),
          }}
          name={name}
          email={email}
          signedInEmail={signedInEmail}
          askName={askName}
          busy={emailCode.busy || accept.isPending || accept.isSuccess}
          onChange={(patch) => {
            if (patch.name !== undefined) setName(patch.name);
            if (patch.email !== undefined) setEmail(patch.email);
          }}
          onSubmit={signedInEmail ? join : sendCode}
        />
      ) : (
        <EmailCodeForm
          email={email}
          busy={emailCode.busy || accept.isPending}
          error={emailCode.error}
          submitLabel={t('details.join')}
          onVerify={verify}
          onResend={() => void emailCode.send(email)}
          onChangeEmail={() => setStep('details')}
        />
      )}
      {step === 'details' && !signedInEmail && <GoogleSignIn callbackURL={router.asPath} />}
      {step === 'details' && emailCode.error && (
        <Alert variant="danger">
          <AlertDescription>{t(`code.errors.${emailCode.error}`)}</AlertDescription>
        </Alert>
      )}
    </JoinIntro>
  );
};
