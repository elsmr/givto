import { knownAppError } from '@/components/group/app-error-code';
import type { GroupMember } from '@/components/group/group-data';
import { inviteErrors } from '@/components/group/invite-form';
import { PersonAvatar } from '@/components/group/person-avatar';
import { useInvalidateGroup } from '@/components/group/use-invalidate-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import type { EditionStatus } from '@/lib/schema/edition';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { RemovePersonDialog } from './remove-person-dialog';
import { settingsErrorKey } from './settings-error';

type PersonRowProps = {
  groupSlug: string;
  editionTitle: string;
  person: GroupMember;
  isMe: boolean;
  /** The viewer owns the group: names organizers and hands over ownership. */
  isOwner: boolean;
  /** Before the draw: tick in or out of this edition. */
  ticked?: { checked: boolean; busy: boolean; onChange: (checked: boolean) => void };
  editionStatus: EditionStatus;
  /** Everyone in the group, to name who'd be stuck when a removal is refused. */
  members: GroupMember[];
};

/** One person in the settings: status, email, in this edition, resend invite, roles, remove (27). */
export const PersonRow = ({ groupSlug, editionTitle, person, isMe, isOwner, ticked, editionStatus, members }: PersonRowProps) => {
  const t = useTranslations('settings.people');
  const tErrors = useTranslations('settings.errors');
  const tGroup = useTranslations('group.people');
  const tInvite = useTranslations('group.invite');
  const trpc = useTRPC();
  const resend = useMutation(
    trpc.invite.send.mutationOptions({
      onSuccess: () => toast.add({ title: t('resent', { email: person.email ?? '' }), type: 'success' }),
      onError: (error) => toast.add({ title: tInvite(`errors.${knownAppError(error, inviteErrors)}`), type: 'error' }),
    })
  );
  const invalidateGroup = useInvalidateGroup(groupSlug);
  const setOrganizer = useMutation(
    trpc.settings.setOrganizer.mutationOptions({
      onSuccess: (_, { organizer }) => {
        toast.add({ title: t(organizer ? 'made-organizer' : 'unmade-organizer', { name: person.name }), type: 'success' });
        void invalidateGroup();
      },
      onError: (error) => toast.add({ title: tErrors(settingsErrorKey(error)), type: 'error' }),
    })
  );
  const canOrganize = isOwner && person.status === 'joined' && person.hasAccount && person.role !== 'owner';
  const removable = !isMe && (person.role === 'member' || (person.role === 'organizer' && isOwner));

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
      <PersonAvatar id={person.id} name={person.name} color={person.avatarColor} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold break-all">{person.name}</span>
          {person.role !== 'member' && <Badge variant="yellow">{tGroup(person.role)}</Badge>}
          {isMe && <Badge>{tGroup('you')}</Badge>}
          {person.status !== 'joined' && <Badge variant="coral">{tGroup(`status.${person.status}`)}</Badge>}
        </div>
        {person.email && person.email !== person.name && <span className="text-sm text-muted break-all">{person.email}</span>}
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
            aria-label={t('resend-label', { name: person.name })}
            onClick={() => resend.mutate({ groupSlug, email: person.email! })}
          >
            {t('resend')}
          </Button>
        )}
        {canOrganize && (
          <Button
            variant="neutral"
            size="sm"
            disabled={setOrganizer.isPending}
            onClick={() => setOrganizer.mutate({ groupSlug, memberId: person.id, organizer: person.role === 'member' })}
          >
            {t(person.role === 'member' ? 'make-organizer' : 'unmake-organizer')}
          </Button>
        )}
        {canOrganize && person.role === 'organizer' && <MakeOwnerDialog groupSlug={groupSlug} person={person} />}
        {removable && <RemovePersonDialog groupSlug={groupSlug} person={person} editionStatus={editionStatus} members={members} />}
      </div>
    </li>
  );
};

const MakeOwnerDialog = ({ groupSlug, person }: { groupSlug: string; person: GroupMember }) => {
  const t = useTranslations('settings');
  const trpc = useTRPC();
  const invalidateGroup = useInvalidateGroup(groupSlug);
  const transfer = useMutation(
    trpc.settings.transferOwnership.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('people.made-owner', { name: person.name }), type: 'success' });
        void invalidateGroup();
      },
    })
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="neutral" size="sm" />}>{t('people.make-owner')}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('people.make-owner-title', { name: person.name })}</DialogTitle>
          <DialogDescription>{t('people.make-owner-description', { name: person.name })}</DialogDescription>
        </DialogHeader>
        {transfer.error && (
          <p role="alert" className="text-danger">
            {t(`errors.${settingsErrorKey(transfer.error)}`)}
          </p>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('people.cancel')}</DialogClose>
          <Button disabled={transfer.isPending} onClick={() => transfer.mutate({ groupSlug, memberId: person.id })}>
            {t('people.make-owner-confirm', { name: person.name })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
