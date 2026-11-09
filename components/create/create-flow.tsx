import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { authClient } from '@/lib/client/auth';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { knownAppError } from '../group/app-error-code';
import { EmailCodeForm } from '../join/email-code-form';
import { NameEmailForm } from '../join/name-email-form';
import { useEmailCode } from '../join/use-email-code';
import { CreatedShare } from './created-share';
import { toCreateInput } from './create-input';
import { DetailsStep } from './details-step';
import { useCreateDraft } from './use-create-draft';

type Step = 'details' | 'organizer' | 'code';

const knownErrors = ['RATE_LIMITED', 'DATE_IN_PAST', 'INVALID_INPUT', 'UNAUTHENTICATED'] as const;
const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** /new, link-first (PLAN-v2 "Create flow"): details → organizer → emailed code → share. */
export const CreateFlow = () => {
  const t = useTranslations('create');
  const tCode = useTranslations('join.code');
  const trpc = useTRPC();
  const router = useRouter();
  const session = authClient.useSession();
  const { draft, restored, update, clear } = useCreateDraft();
  const [step, setStep] = useState<Step>('details');
  const emailCode = useEmailCode('/new?resume=1');
  const create = useMutation(
    trpc.group.create.mutationOptions({
      onSuccess: () => {
        clear();
        // The account may just have got its name.
        void session.refetch();
      },
    })
  );

  // Back from the magic link: the details are filled in, continue where we left off.
  const resuming = router.query.resume === '1';
  useEffect(() => {
    if (restored === 'saved' && resuming) setStep('organizer');
  }, [restored, resuming]);

  if (restored === 'pending' || session.isPending) return <Loader />;
  if (create.data) {
    return <CreatedShare slug={create.data.slug} token={create.data.joinToken} groupName={create.variables.name} />;
  }

  const signedInEmail = session.data?.user.email ?? null;
  const submitCreate = () => create.mutate(toCreateInput(draft, timeZone()));
  const sendCode = async () => {
    if (await emailCode.send(draft.email)) setStep('code');
  };
  const verify = async (otp: string) => {
    if (!(await emailCode.verify(draft.email, otp))) return;
    setStep('organizer');
    submitCreate();
  };
  const errorCode = create.error && knownAppError(create.error, knownErrors);
  const stepNumber = { details: 1, organizer: 2, code: 3 }[step];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="font-semibold text-muted">{t('step', { step: stepNumber, total: signedInEmail ? 2 : 3 })}</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t(`titles.${step}`)}</h1>
      </div>
      {errorCode && (
        <Alert variant="danger">
          <AlertDescription>{t(`errors.${errorCode}`)}</AlertDescription>
        </Alert>
      )}
      {step === 'details' && (
        <DetailsStep draft={draft} timeZone={timeZone()} onChange={update} onNext={() => setStep('organizer')} />
      )}
      {step === 'organizer' && (
        <NameEmailForm
          texts={{
            name: t('organizer.name'),
            nameHelp: t('organizer.name-help'),
            email: t('organizer.email'),
            emailHelp: t('organizer.email-help'),
            signedIn: t('organizer.signed-in', { email: signedInEmail ?? '' }),
            submit: signedInEmail ? t('create') : t('organizer.send-code'),
          }}
          name={draft.organizerName}
          email={draft.email}
          signedInEmail={signedInEmail}
          busy={emailCode.busy || create.isPending}
          onChange={({ name, email }) => update({ organizerName: name ?? draft.organizerName, email: email ?? draft.email })}
          onSubmit={signedInEmail ? submitCreate : sendCode}
        >
          <Button type="button" variant="neutral" size="lg" onClick={() => setStep('details')}>
            {t('organizer.back')}
          </Button>
        </NameEmailForm>
      )}
      {step === 'organizer' && emailCode.error && (
        <Alert variant="danger">
          <AlertDescription>{tCode(`errors.${emailCode.error}`)}</AlertDescription>
        </Alert>
      )}
      {step === 'code' && (
        <EmailCodeForm
          email={draft.email}
          busy={emailCode.busy || create.isPending}
          error={emailCode.error}
          submitLabel={t('create')}
          onVerify={verify}
          onResend={() => void emailCode.send(draft.email)}
          onChangeEmail={() => setStep('organizer')}
        />
      )}
    </div>
  );
};
