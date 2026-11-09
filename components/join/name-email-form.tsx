import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Email, PersonName } from '@/lib/schema/common';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent, type ReactNode } from 'react';
import { fieldIssue, type FieldIssue } from '../group/field-issue';

export type NameEmailTexts = {
  name: string;
  nameHelp: string;
  email: string;
  emailHelp: string;
  signedIn: string;
  submit: string;
};

type NameEmailFormProps = {
  texts: NameEmailTexts;
  name: string;
  email: string;
  /** Signed in: the session is the verified email, so only the name is asked. */
  signedInEmail: string | null;
  busy: boolean;
  onChange: (patch: { name?: string; email?: string }) => void;
  onSubmit: () => void;
  /** Extra buttons next to submit, e.g. Back. */
  children?: ReactNode;
};

/** Name + email to verify (or just the name when signed in): create's organizer step and joining. */
export const NameEmailForm = ({
  texts,
  name,
  email,
  signedInEmail,
  busy,
  onChange,
  onSubmit,
  children,
}: NameEmailFormProps) => {
  const tIssues = useTranslations('group.issues');
  const [issues, setIssues] = useState<{ name: FieldIssue | null; email: FieldIssue | null }>({ name: null, email: null });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      name: fieldIssue(PersonName, name),
      email: signedInEmail ? null : fieldIssue(Email, email),
    };
    setIssues(next);
    if (!next.name && !next.email) onSubmit();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={issues.name ? 'true' : undefined}>
          <FieldLabel htmlFor="person-name">{texts.name}</FieldLabel>
          <Input
            id="person-name"
            required
            maxLength={50}
            autoComplete="name"
            value={name}
            aria-invalid={issues.name ? 'true' : undefined}
            onChange={(event) => onChange({ name: event.target.value })}
          />
          <FieldDescription>{texts.nameHelp}</FieldDescription>
          {issues.name && <FieldError>{tIssues(issues.name)}</FieldError>}
        </Field>
        {signedInEmail ? (
          <p className="text-muted">{texts.signedIn}</p>
        ) : (
          <Field data-invalid={issues.email ? 'true' : undefined}>
            <FieldLabel htmlFor="person-email">{texts.email}</FieldLabel>
            <Input
              id="person-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              aria-invalid={issues.email ? 'true' : undefined}
              onChange={(event) => onChange({ email: event.target.value })}
            />
            <FieldDescription>{texts.emailHelp}</FieldDescription>
            {issues.email && <FieldError>{tIssues('invalid_email')}</FieldError>}
          </Field>
        )}
      </FieldGroup>
      <div className="flex flex-col gap-3 xs:flex-row">
        <Button type="submit" size="lg" disabled={busy}>
          {texts.submit}
        </Button>
        {children}
      </div>
    </form>
  );
};
