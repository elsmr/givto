import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { Email, PersonName } from '@/lib/schema/common';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { knownAppError } from './app-error-code';
import { fieldIssue, type FieldIssue } from './field-issue';
import { useInvalidateGroup } from './use-invalidate-group';

const knownErrors = ['ALREADY_MEMBER', 'RATE_LIMITED', 'GROUP_FULL', 'INVALID_INPUT'] as const;

/** Email invites, secondary to the link (45): one person at a time. */
export const InviteForm = ({ slug }: { slug: string }) => {
  const t = useTranslations('group.invite');
  const tIssues = useTranslations('group.issues');
  const trpc = useTRPC();
  const invalidate = useInvalidateGroup(slug);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [issue, setIssue] = useState<FieldIssue | null>(null);
  const send = useMutation(
    trpc.invite.send.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('sent', { email }), type: 'success' });
        setName('');
        setEmail('');
        void invalidate();
      },
    })
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = fieldIssue(PersonName, name) ?? (fieldIssue(Email, email) ? 'invalid_email' : null);
    setIssue(found);
    if (!found) send.mutate({ groupSlug: slug, name, email });
  };
  const errorCode = send.error && knownAppError(send.error, knownErrors);

  return (
    <form onSubmit={submit}>
      <FieldSet>
        <FieldLegend>{t('legend')}</FieldLegend>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field>
            <FieldLabel htmlFor="invite-name">{t('name')}</FieldLabel>
            <Input id="invite-name" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="invite-email">{t('email')}</FieldLabel>
            <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" variant="neutral" disabled={send.isPending}>
            {t('send')}
          </Button>
        </div>
        {issue && <FieldError>{tIssues(issue)}</FieldError>}
        {errorCode && <FieldError>{t(`errors.${errorCode}`)}</FieldError>}
      </FieldSet>
    </form>
  );
};
