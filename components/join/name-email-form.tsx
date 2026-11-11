import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
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
  /** Signed in: the session is the verified email, so the email isn't asked. */
  signedInEmail: string | null;
  /** Only signed in, for an account without a name yet: before that we can't know whether it has one. */
  askName: boolean;
  busy: boolean;
  onChange: (patch: { name?: string; email?: string }) => void;
  onSubmit: () => void;
  /** Extra buttons next to submit, e.g. Back. */
  children?: ReactNode;
};

/** The email to verify when signed out; signed in, the name if the account has none: create's organizer step and joining. */
export const NameEmailForm = ({
  texts,
  name,
  email,
  signedInEmail,
  askName,
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
      name: askName ? fieldIssue(PersonName, name) : null,
      email: signedInEmail ? null : fieldIssue(Email, email),
    };
    setIssues(next);
    if (!next.name && !next.email) onSubmit();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <FieldGroup>
        {askName && (
        <Field data-invalid={issues.name ? 'true' : undefined}>
          <FieldLabel htmlFor="person-name" hint={texts.nameHelp}>
            {texts.name}
          </FieldLabel>
          <Input
            id="person-name"
            required
            maxLength={50}
            autoComplete="name"
            value={name}
            aria-invalid={issues.name ? 'true' : undefined}
            onChange={(event) => onChange({ name: event.target.value })}
          />
          {issues.name && <FieldError>{tIssues(issues.name)}</FieldError>}
        </Field>
        )}
        {signedInEmail ? (
          <p className="text-muted">{texts.signedIn}</p>
        ) : (
          <Field data-invalid={issues.email ? 'true' : undefined}>
            <FieldLabel htmlFor="person-email" hint={texts.emailHelp}>
              {texts.email}
            </FieldLabel>
            <Input
              id="person-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              aria-invalid={issues.email ? 'true' : undefined}
              onChange={(event) => onChange({ email: event.target.value })}
            />
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
