import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { authClient } from '@/lib/client/auth';
import { useTRPC } from '@/lib/client/trpc';
import type { JoinPreview } from '@/lib/server/join-preview';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { knownAppError } from '../group/app-error-code';
import { EmailCodeForm } from './email-code-form';
import { JoinIntro } from './join-intro';
import { JoinRequested } from './join-requested';
import { NameEmailForm } from './name-email-form';
import { useEmailCode } from './use-email-code';
import { useJoinName } from './use-join-name';

const knownErrors = ['GROUP_FULL', 'JOIN_LINK_INVALID', 'RATE_LIMITED', 'INVALID_INPUT'] as const;

type JoinFlowProps = { slug: string; token: string; preview: JoinPreview };

/** Join via the group link (45): name + email → emailed code → member (or waiting for approval). */
export const JoinFlow = ({ slug, token, preview }: JoinFlowProps) => {
  const t = useTranslations('join');
  const trpc = useTRPC();
  const router = useRouter();
  const session = authClient.useSession();
  const joinName = useJoinName(session.data?.user.name);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'details' | 'code'>('details');
  const emailCode = useEmailCode(router.asPath);
  const accept = useMutation(
    trpc.join.accept.mutationOptions({
      onSuccess: ({ status }) => {
        joinName.forget();
        void session.refetch();
        if (status === 'joined') void router.push(`/g/${slug}`);
      },
    })
  );

  if (session.isPending) return <LogoAnimation variant="loading" />;
  if (accept.data?.status === 'requested') return <JoinRequested organizer={preview.organizerFirstName} />;

  const signedInEmail = session.data?.user.email ?? null;
  const join = () => accept.mutate({ groupSlug: slug, token, name: joinName.name });
  const sendCode = async () => {
    joinName.remember();
    if (await emailCode.send(email)) setStep('code');
  };
  const verify = async (otp: string) => {
    if (!(await emailCode.verify(email, otp))) return;
    setStep('details');
    join();
  };
  const errorCode = accept.error && knownAppError(accept.error, knownErrors);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <JoinIntro preview={preview} />
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
          name={joinName.name}
          email={email}
          signedInEmail={signedInEmail}
          busy={emailCode.busy || accept.isPending || accept.isSuccess}
          onChange={(patch) => {
            if (patch.name !== undefined) joinName.setName(patch.name);
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
      {step === 'details' && emailCode.error && (
        <Alert variant="danger">
          <AlertDescription>{t(`code.errors.${emailCode.error}`)}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
