import { FlowPage } from '@/components/shell/flow-page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { authClient } from '@/lib/client/auth';
import { useTRPC } from '@/lib/client/trpc';
import { useFocusStepHeading } from '@/lib/client/use-focus-step-heading';
import { cn } from '@/lib/utils';
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

/** The phase stepper's look, small: done steps filled, the current one raised, the rest dashed. A status, not navigation. */
const StepTrack = ({ step, total }: { step: number; total: number }) => {
  const t = useTranslations('create');
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden="true" className="flex w-28 items-center gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              'h-3 flex-1 border-2 border-outline',
              index + 1 < step && 'bg-mint',
              index + 1 === step && 'h-4 bg-yellow shadow-sm',
              index + 1 > step && 'border-dashed border-muted',
            )}
          />
        ))}
      </div>
      <span className="text-sm">{t('step', { step, total })}</span>
    </div>
  );
};

/** /new, link-first (PLAN-v2 "Create flow"): details → organizer → emailed code → share; signed in with a name, details → share. */
export const CreateFlow = () => {
  const t = useTranslations('create');
  const tCode = useTranslations('join.code');
  const trpc = useTRPC();
  const router = useRouter();
  const session = authClient.useSession();
  const { draft, restored, update, clear } = useCreateDraft();
  const [step, setStep] = useState<Step>('details');
  const heading = useFocusStepHeading(step);
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

  if (restored === 'pending' || session.isPending) return <LogoAnimation variant="loading" />;
  if (create.data) {
    return <CreatedShare slug={create.data.slug} token={create.data.joinToken} groupName={create.variables.name} />;
  }

  const signedInEmail = session.data?.user.email ?? null;
  // Signed in with a name: there's nothing left to ask, so the details step creates.
  const accountName = signedInEmail ? session.data?.user.name : undefined;
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
  const createLabel = draft.kind === 'whiteElephant' ? t('create-white-elephant') : t('create');

  return (
    <FlowPage
      eyebrow={accountName ? undefined : <StepTrack step={stepNumber} total={signedInEmail ? 2 : 3} />}
      title={t(`titles.${step}`)}
      headingRef={heading}
    >
      <Card>
        <CardContent className="flex flex-col gap-6">
          {errorCode && (
            <Alert variant="danger">
              <AlertDescription>{t(`errors.${errorCode}`)}</AlertDescription>
            </Alert>
          )}
          {step === 'details' && (
            <DetailsStep
              draft={draft}
              timeZone={timeZone()}
              onChange={update}
              submitLabel={accountName ? createLabel : t('details.next')}
              busy={create.isPending}
              onNext={
                accountName
                  ? () => create.mutate(toCreateInput({ ...draft, organizerName: accountName }, timeZone()))
                  : () => setStep('organizer')
              }
            />
          )}
          {step === 'organizer' && (
            <NameEmailForm
              texts={{
                name: t('organizer.name'),
                nameHelp: t('organizer.name-help'),
                email: t('organizer.email'),
                emailHelp: t('organizer.email-help'),
                signedIn: t('organizer.signed-in', { email: signedInEmail ?? '' }),
                submit: signedInEmail ? createLabel : t('organizer.send-code'),
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
              submitLabel={createLabel}
              onVerify={verify}
              onResend={() => void emailCode.send(draft.email)}
              onChangeEmail={() => setStep('organizer')}
            />
          )}
        </CardContent>
      </Card>
    </FlowPage>
  );
};
