import type { GroupMember } from '@/components/group/group-data';
import { PersonAvatar } from '@/components/group/person-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { RemovePersonDialog } from './remove-person-dialog';

type PersonRowProps = {
  groupSlug: string;
  editionTitle: string;
  person: GroupMember;
  isMe: boolean;
  /** Before the draw: tick in or out of this edition. */
  ticked?: { checked: boolean; busy: boolean; onChange: (checked: boolean) => void };
  drawn: boolean;
};

/** One person in the settings: status, email, in this edition, resend invite, remove (27). */
export const PersonRow = ({ groupSlug, editionTitle, person, isMe, ticked, drawn }: PersonRowProps) => {
  const t = useTranslations('settings.people');
  const tErrors = useTranslations('settings.errors');
  const tGroup = useTranslations('group.people');
  const trpc = useTRPC();
  const resend = useMutation(
    trpc.invite.send.mutationOptions({
      onSuccess: () => toast.add({ title: t('resent', { email: person.email ?? '' }), type: 'success' }),
      onError: () => toast.add({ title: tErrors('INTERNAL'), type: 'error' }),
    })
  );

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <PersonAvatar id={person.id} name={person.name} color={person.avatarColor} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold break-all">{person.name}</span>
          {person.role === 'organizer' && <Badge variant="yellow">{tGroup('organizer')}</Badge>}
          {isMe && <Badge>{tGroup('you')}</Badge>}
          {person.status !== 'joined' && <Badge variant="coral">{tGroup(`status.${person.status}`)}</Badge>}
        </div>
        {person.email && <span className="text-sm text-muted break-all">{person.email}</span>}
        {ticked && (
          <Field orientation="horizontal" className="w-auto">
            <Checkbox
              id={`ticked-${person.id}`}
              aria-label={t('ticked-label', { name: person.name, edition: editionTitle })}
              checked={ticked.checked}
              disabled={ticked.busy}
              onCheckedChange={(checked) => ticked.onChange(checked)}
            />
            <FieldLabel htmlFor={`ticked-${person.id}`}>{t('ticked', { edition: editionTitle })}</FieldLabel>
          </Field>
        )}
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {person.status === 'invited' && person.email && (
          <Button
            variant="neutral"
            size="sm"
            disabled={resend.isPending}
            onClick={() => resend.mutate({ groupSlug, email: person.email! })}
          >
            {t('resend')}
          </Button>
        )}
        {person.role !== 'organizer' && <RemovePersonDialog groupSlug={groupSlug} person={person} drawn={drawn} />}
      </div>
    </li>
  );
};
