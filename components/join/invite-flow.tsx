import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { authClient } from '@/lib/client/auth';
import { signOut } from '@/lib/client/session';
import { useTRPC } from '@/lib/client/trpc';
import type { JoinPreview } from '@/lib/server/join-preview';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { knownAppError } from '../group/app-error-code';
import { EmailCodeForm } from './email-code-form';
import { JoinIntro } from './join-intro';
import { useEmailCode } from './use-email-code';

const knownErrors = ['INVITE_INVALID', 'INVITE_EMAIL_MISMATCH', 'RATE_LIMITED'] as const;

type InviteFlowProps = { slug: string; token: string; preview: JoinPreview & { invite: { email: string } } };

/** Email invite (45, secondary): bound to one address, single-use; accept lands on the group, or decline (48). */
export const InviteFlow = ({ slug, token, preview }: InviteFlowProps) => {
  const t = useTranslations('join');
  const trpc = useTRPC();
  const router = useRouter();
  const session = authClient.useSession();
  const [codeSent, setCodeSent] = useState(false);
  const emailCode = useEmailCode(router.asPath);
  const accept = useMutation(
    trpc.invite.accept.mutationOptions({
      onSuccess: () => {
        void session.refetch();
        void router.push(`/g/${slug}`);
      },
    })
  );
  const decline = useMutation(trpc.invite.decline.mutationOptions());
  const { email } = preview.invite;

  if (session.isPending) return <Loader />;
  if (decline.isSuccess) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t('invite.declined-title')}</h1>
        <p className="text-lg">{t('invite.declined', { organizer: preview.organizerFirstName })}</p>
      </div>
    );
  }

  const signedInEmail = session.data?.user.email ?? null;
  const acceptInvite = () => accept.mutate({ groupSlug: slug, token });
  const send = async () => setCodeSent(await emailCode.send(email));
  const verify = async (otp: string) => {
    if (await emailCode.verify(email, otp)) acceptInvite();
  };
  const error = accept.error ?? decline.error;
  const errorCode = error && knownAppError(error, knownErrors);
  const busy = emailCode.busy || accept.isPending || accept.isSuccess || decline.isPending;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <JoinIntro preview={preview} />
      {errorCode && (
        <Alert variant="danger">
          <AlertDescription>{t(`errors.${errorCode}`)}</AlertDescription>
        </Alert>
      )}
      {codeSent && !signedInEmail ? (
        <EmailCodeForm
          email={email}
          busy={busy}
          error={emailCode.error}
          submitLabel={t('details.join')}
          onVerify={verify}
          onResend={() => void send()}
          onChangeEmail={() => setCodeSent(false)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <p>{signedInEmail && signedInEmail !== email ? t('invite.other-account', { email, signedInEmail }) : t('invite.for', { email })}</p>
          {emailCode.error && <p className="text-danger">{t(`code.errors.${emailCode.error}`)}</p>}
          <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            {signedInEmail === email && (
              <Button size="lg" disabled={busy} onClick={acceptInvite}>{t('details.join')}</Button>
            )}
            {!signedInEmail && (
              <Button size="lg" disabled={busy} onClick={() => void send()}>{t('invite.send-code')}</Button>
            )}
            {signedInEmail && signedInEmail !== email && (
              <Button size="lg" disabled={busy} onClick={() => void signOut()}>{t('invite.sign-out')}</Button>
            )}
            <Button size="lg" variant="neutral" disabled={busy} onClick={() => decline.mutate({ groupSlug: slug, token })}>
              {t('invite.decline')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
