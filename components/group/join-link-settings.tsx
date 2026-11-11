import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useTRPC } from '@/lib/client/trpc';
import { MIN_PARTICIPANTS, MAX_MEMBERS } from '@/lib/schema/group';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { GroupData } from './group-data';
import { useInvalidateGroup } from './use-invalidate-group';

type JoinLink = NonNullable<NonNullable<GroupData['organizer']>['joinLink']>;

/** Approval, member cap, turn off / new link (45). */
export const JoinLinkSettings = ({ slug, joinLink }: { slug: string; joinLink: JoinLink }) => {
  const t = useTranslations('group.share.settings');
  const trpc = useTRPC();
  const invalidate = useInvalidateGroup(slug);
  const [cap, setCap] = useState(joinLink.maxMembers ? String(joinLink.maxMembers) : '');
  const update = useMutation(trpc.join.updateLink.mutationOptions({ onSuccess: invalidate }));
  const revoke = useMutation(trpc.join.revokeLink.mutationOptions({ onSuccess: invalidate }));
  const regenerate = useMutation(trpc.join.regenerateLink.mutationOptions({ onSuccess: invalidate }));
  const save = (requiresApproval: boolean, maxMembers: string) =>
    update.mutate({ groupSlug: slug, requiresApproval, maxMembers: maxMembers ? Number(maxMembers) : null });

  return (
    <div className="flex flex-col gap-5">
      <Field orientation="horizontal">
        <Switch
          id="requires-approval"
          checked={joinLink.requiresApproval}
          disabled={update.isPending}
          onCheckedChange={(checked) => save(checked, cap)}
        />
        <FieldLabel htmlFor="requires-approval">{t('approval')}</FieldLabel>
      </Field>
      <Field>
        <FieldLabel htmlFor="member-cap" optional hint={t('cap-help')}>
          {t('cap')}
        </FieldLabel>
        <Input
          id="member-cap"
          type="number"
          inputMode="numeric"
          min={MIN_PARTICIPANTS}
          max={MAX_MEMBERS}
          className="max-w-32"
          value={cap}
          onChange={(event) => setCap(event.target.value)}
          onBlur={() => cap !== String(joinLink.maxMembers ?? '') && save(joinLink.requiresApproval, cap)}
        />
      </Field>
      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
        {!joinLink.revoked && (
          <Button variant="neutral" disabled={revoke.isPending} onClick={() => revoke.mutate({ groupSlug: slug })}>
            {t('revoke')}
          </Button>
        )}
        <Button variant="neutral" disabled={regenerate.isPending} onClick={() => regenerate.mutate({ groupSlug: slug })}>
          {t('regenerate')}
        </Button>
      </div>
    </div>
  );
};
