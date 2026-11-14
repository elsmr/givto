import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';
import { withTooltip } from '@/components/ui/tooltip';
import { useTRPC } from '@/lib/client/trpc';
import { Email } from '@/lib/schema/common';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import * as v from 'valibot';
import { knownAppError } from './app-error-code';
import { useInvalidateGroup } from './use-invalidate-group';

const knownErrors = ['ALREADY_MEMBER', 'RATE_LIMITED', 'GROUP_FULL', 'INVALID_INPUT'] as const;
type ErrorCode = (typeof knownErrors)[number] | 'INTERNAL';
const SEPARATORS = /[\s,;]+/;

/** Splits typed or pasted text into valid addresses (normalized) and whatever isn't one. */
const splitEmails = (text: string) => {
  const parts = text.split(SEPARATORS).filter(Boolean);
  const results = parts.map((part) => ({ part, parsed: v.safeParse(Email, part) }));
  return {
    valid: results.flatMap(({ parsed }) => (parsed.success ? [parsed.output] : [])),
    rest: results.flatMap(({ part, parsed }) => (parsed.success ? [] : [part])).join(' '),
  };
};

/**
 * Email invites (45): type or paste addresses, each becomes a removable tag (Backspace removes the last).
 * Send invites them one by one; the ones that failed stay, with why. Invitees say their own name when they accept.
 */
export const InviteForm = ({ slug }: { slug: string }) => {
  const t = useTranslations('group.invite');
  const id = useId();
  const trpc = useTRPC();
  const invalidate = useInvalidateGroup(slug);
  const send = useMutation(trpc.invite.send.mutationOptions());
  const [emails, setEmails] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [failed, setFailed] = useState<Record<string, ErrorCode>>({});
  const [busy, setBusy] = useState(false);
  // Text left in the box after an Enter, separator or blur isn't an address.
  const [notAnEmail, setNotAnEmail] = useState(false);

  /** Moves the valid addresses in `value` into tags; the rest stays in the box. Returns the tags. */
  const addTyped = (value: string) => {
    const { valid, rest } = splitEmails(value);
    const next = [...new Set([...emails, ...valid])];
    setEmails(next);
    setText(rest);
    setNotAnEmail(rest !== '');
    return next;
  };
  const remove = (email: string) => setEmails((current) => current.filter((other) => other !== email));

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && text.trim()) {
      event.preventDefault();
      addTyped(text);
    }
    if (event.key === 'Backspace' && text === '' && emails.length > 0) remove(emails.at(-1)!);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const all = addTyped(text);
    if (all.length === 0) return;
    setBusy(true);
    const results = [];
    for (const email of all) {
      results.push(
        await send.mutateAsync({ groupSlug: slug, email }).then(
          () => ({ email, error: null }),
          (error: unknown) => ({ email, error: (knownAppError(error, knownErrors) ?? 'INTERNAL') as ErrorCode })
        )
      );
    }
    const sent = results.filter((result) => !result.error).length;
    setEmails(results.flatMap(({ email, error }) => (error ? [email] : [])));
    setFailed(Object.fromEntries(results.flatMap(({ email, error }) => (error ? [[email, error]] : []))));
    setBusy(false);
    if (sent > 0) {
      toast.add({ title: t('sent', { count: sent }), type: 'success' });
      void invalidate();
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field data-invalid={notAnEmail ? 'true' : undefined}>
        <FieldLabel htmlFor={id}>{t('label')}</FieldLabel>
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 border-2 border-control bg-surface p-1.5 has-aria-invalid:border-danger focus-within:border-focus focus-within:shadow-[inset_0_0_0_1px_var(--color-focus)]">
          {emails.map((email) => (
            <span
              key={email}
              className={cn(
                'inline-flex max-w-full items-center gap-1 border-2 border-outline py-0.5 pr-0.5 pl-2 text-sm',
                failed[email] ? 'bg-coral text-ink' : 'bg-primary-muted text-ink'
              )}
            >
              <span className="truncate">{email}</span>
              {withTooltip(
                t('remove', { email }),
                <button type="button" className="relative grid size-6 shrink-0 place-items-center after:absolute after:-inset-2 hover:bg-surface" onClick={() => remove(email)}>
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </span>
          ))}
          <input
            id={id}
            type="text"
            inputMode="email"
            autoComplete="off"
            className="h-8 min-w-48 flex-1 bg-transparent px-1.5 text-base text-ink outline-none placeholder:text-muted"
            placeholder={emails.length === 0 ? t('placeholder') : undefined}
            value={text}
            aria-invalid={notAnEmail ? 'true' : undefined}
            aria-describedby={notAnEmail ? `${id}-error` : undefined}
            onChange={(event) => {
              if (SEPARATORS.test(event.target.value)) return void addTyped(event.target.value);
              setText(event.target.value);
              setNotAnEmail(false);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => text.trim() && addTyped(text)}
          />
        </div>
        <FieldDescription>{t('help')}</FieldDescription>
        {notAnEmail && <FieldError id={`${id}-error`}>{t('invalid')}</FieldError>}
        {Object.entries(failed)
          .filter(([email]) => emails.includes(email))
          .map(([email, code]) => (
            <FieldError key={email}>{t('failed', { email, reason: t(`errors.${code}`) })}</FieldError>
          ))}
      </Field>
      <Button type="submit" variant="neutral" className="xs:self-start" disabled={busy || (emails.length === 0 && !text.trim())}>
        {t('send', { count: emails.length })}
      </Button>
    </form>
  );
};
