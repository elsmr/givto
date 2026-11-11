import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldSeparator } from '@/components/ui/field';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { InviteForm } from './invite-form';
import { SharePanel } from './share-panel';
import { useInvalidateGroup } from './use-invalidate-group';

type InvitePeopleProps = {
  slug: string;
  groupName: string;
  /** No link, or turned off: says so, with a button for a new one, instead of the link row. */
  joinLink: { token: string; revoked: boolean } | undefined;
  /** Right after creating, copying is the screen's main action. */
  primary?: boolean;
  /** Under the link row, e.g. the link settings. */
  linkExtra?: ReactNode;
};

/** The organizer's way to get people in, wherever they invite (45): the join link or QR, or email invites. */
export const InvitePeople = ({ slug, groupName, joinLink, primary, linkExtra }: InvitePeopleProps) => {
  const t = useTranslations('group.share');
  const trpc = useTRPC();
  const invalidate = useInvalidateGroup(slug);
  const regenerate = useMutation(trpc.join.regenerateLink.mutationOptions({ onSuccess: invalidate }));

  return (
    <div className="flex flex-col gap-4">
      {joinLink && !joinLink.revoked ? (
        <SharePanel slug={slug} token={joinLink.token} groupName={groupName} primary={primary} />
      ) : (
        <Alert>
          <AlertDescription>{t('revoked')}</AlertDescription>
          <Button
            variant="neutral"
            size="sm"
            className="col-start-2 mt-2 justify-self-start"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate({ groupSlug: slug })}
          >
            {t('settings.regenerate')}
          </Button>
        </Alert>
      )}
      {linkExtra}
      {/* The label sits on the card, not the page. */}
      <FieldSeparator className="*:data-[slot=field-separator-content]:bg-surface [&_[role=separator]]:border-dashed">
        {t('or')}
      </FieldSeparator>
      <InviteForm slug={slug} />
    </div>
  );
};
