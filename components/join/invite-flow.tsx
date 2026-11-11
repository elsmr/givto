import { Alert, AlertDescription } from '@/components/ui/alert';
import { FlowPage, MessageCard } from '@/components/shell/flow-page';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { authClient } from '@/lib/client/auth';
import { signOut } from '@/lib/client/session';
import { useTRPC } from '@/lib/client/trpc';
import { PersonName } from '@/lib/schema/common';
import type { JoinPreview } from '@/lib/server/join-preview';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { knownAppError } from '../group/app-error-code';
import { fieldIssue, type FieldIssue } from '../group/field-issue';
import { EmailCodeForm } from './email-code-form';
import { JoinIntro } from './join-intro';
import { useEmailCode } from './use-email-code';
import { useJoinName } from './use-join-name';

const knownErrors = ['INVITE_INVALID', 'INVITE_EMAIL_MISMATCH', 'RATE_LIMITED'] as const;

type InviteFlowProps = { slug: string; token: string; preview: JoinPreview & { invite: { email: string } } };

/** Email invite (45, secondary): bound to one address, single-use; say your name and accept to land on the group, or decline (48). */
export const InviteFlow = ({ slug, token, preview }: InviteFlowProps) => {
  const t = useTranslations('join');
  const tIssues = useTranslations('group.issues');
  const trpc = useTRPC();
  const router = useRouter();
  const session = authClient.useSession();
  const joinName = useJoinName(session.data?.user.name);
  const [nameIssue, setNameIssue] = useState<FieldIssue | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const emailCode = useEmailCode(router.asPath);
  const accept = useMutation(
    trpc.invite.accept.mutationOptions({
      onSuccess: () => {
        joinName.forget();
        void session.refetch();
        void router.push(`/g/${slug}`);
      },
    })
  );
  const decline = useMutation(trpc.invite.decline.mutationOptions());
  const { email } = preview.invite;

  if (session.isPending) return <LogoAnimation variant="loading" />;
  if (decline.isSuccess) {
    return (
      <FlowPage title={t('invite.declined-title')}>
        <MessageCard
          actions={
            <Link href={session.data ? '/app' : '/'} className={buttonVariants()}>
              {t('invite.home')}
            </Link>
          }
        >
          <p>{t('invite.declined', { organizer: preview.organizerFirstName })}</p>
        </MessageCard>
      </FlowPage>
    );
  }

  const signedInEmail = session.data?.user.email ?? null;
  const acceptInvite = () => accept.mutate({ groupSlug: slug, token, name: joinName.name });
  /** Runs `next` once the name is valid. */
  const withName = (next: () => void) => {
    const issue = fieldIssue(PersonName, joinName.name);
    setNameIssue(issue);
    if (!issue) next();
  };
  const send = async () => {
    joinName.remember();
    setCodeSent(await emailCode.send(email));
  };
  const verify = async (otp: string) => {
    if (await emailCode.verify(email, otp)) acceptInvite();
  };
  const error = accept.error ?? decline.error;
  const errorCode = error && knownAppError(error, knownErrors);
  const busy = emailCode.busy || accept.isPending || accept.isSuccess || decline.isPending;

  return (
    <JoinIntro preview={preview}>
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
          {(!signedInEmail || signedInEmail === email) && (
            <Field data-invalid={nameIssue ? 'true' : undefined}>
              <FieldLabel htmlFor="person-name">{t('details.name')}</FieldLabel>
              <Input
                id="person-name"
                required
                maxLength={50}
                autoComplete="name"
                value={joinName.name}
                aria-invalid={nameIssue ? 'true' : undefined}
                onChange={(event) => joinName.setName(event.target.value)}
              />
              <FieldDescription>{t('details.name-help')}</FieldDescription>
              {nameIssue && <FieldError>{tIssues(nameIssue)}</FieldError>}
            </Field>
          )}
          {emailCode.error && <p className="text-danger">{t(`code.errors.${emailCode.error}`)}</p>}
          <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            {signedInEmail === email && (
              <Button size="lg" disabled={busy} onClick={() => withName(acceptInvite)}>{t('details.join')}</Button>
            )}
            {!signedInEmail && (
              <Button size="lg" disabled={busy} onClick={() => withName(() => void send())}>{t('invite.send-code')}</Button>
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
    </JoinIntro>
  );
};
