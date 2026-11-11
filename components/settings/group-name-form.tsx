import { fieldIssue, type FieldIssue } from '@/components/group/field-issue';
import { useInvalidateGroup } from '@/components/group/use-invalidate-group';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { GroupName } from '@/lib/schema/group';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';

/** Rename the group (organizer only, 27). */
export const GroupNameForm = ({ slug, name }: { slug: string; name: string }) => {
  const t = useTranslations('settings');
  const tIssues = useTranslations('group.issues');
  const trpc = useTRPC();
  const invalidate = useInvalidateGroup(slug);
  const [value, setValue] = useState(name);
  const [issue, setIssue] = useState<FieldIssue | null>(null);
  const rename = useMutation(
    trpc.settings.rename.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('saved'), type: 'success' });
        void invalidate();
      },
    })
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = fieldIssue(GroupName, value);
    setIssue(found);
    if (!found) rename.mutate({ groupSlug: slug, name: value });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field data-invalid={issue ? 'true' : undefined}>
        <FieldLabel htmlFor="settings-group-name">{t('group-name.label')}</FieldLabel>
        <Input id="settings-group-name" required maxLength={80} value={value} onChange={(event) => setValue(event.target.value)} />
        <FieldDescription>{t('group-name.help')}</FieldDescription>
        {issue && <FieldError>{tIssues(issue)}</FieldError>}
        {rename.error && <FieldError>{t('errors.INTERNAL')}</FieldError>}
      </Field>
      <Button type="submit" className="self-start" disabled={rename.isPending}>
        {t('save')}
      </Button>
    </form>
  );
};
