import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldSeparator } from '@/components/ui/field';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { InviteForm } from './invite-form';
import { SharePanel } from './share-panel';

type InvitePeopleProps = {
  slug: string;
  groupName: string;
  locale: string;
  /** No link, or turned off: says so instead of the link row. */
  joinLink: { token: string; revoked: boolean } | undefined;
  /** Right after creating, copying is the screen's main action. */
  primary?: boolean;
  /** Under the link row, e.g. the link settings. */
  linkExtra?: ReactNode;
};

/** The organizer's way to get people in, wherever they invite (45): the join link or QR, or email invites. */
export const InvitePeople = ({ slug, groupName, locale, joinLink, primary, linkExtra }: InvitePeopleProps) => {
  const t = useTranslations('group.share');

  return (
    <div className="flex flex-col gap-4">
      {joinLink && !joinLink.revoked ? (
        <SharePanel slug={slug} token={joinLink.token} groupName={groupName} locale={locale} primary={primary} />
      ) : (
        <Alert>
          <AlertDescription>{t('revoked')}</AlertDescription>
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
