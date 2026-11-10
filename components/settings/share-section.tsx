import type { GroupData } from '@/components/group/group-data';
import { InviteForm } from '@/components/group/invite-form';
import { JoinLinkSettings } from '@/components/group/join-link-settings';
import { SharePanel } from '@/components/group/share-panel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardDivider, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { ChevronDown, Link2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Organizer: joined counter, the join link and its settings, email invites (45). */
export const ShareSection = ({ group }: { group: GroupData }) => {
  const t = useTranslations('group.share');
  const joinLink = group.organizer?.joinLink;

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Link2} tone="mint">
          {t('title')}
        </IconCardTitle>
        <CardDescription>{t('joined', { count: group.joinedCount })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {joinLink && !joinLink.revoked ? (
          <SharePanel slug={group.slug} token={joinLink.token} groupName={group.name} locale={group.locale} />
        ) : (
          <Alert>
            <AlertDescription>{t('revoked')}</AlertDescription>
          </Alert>
        )}
        {joinLink && (
          <details className="group/link-settings border-2 border-outline">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 font-semibold hover:bg-page group-open/link-settings:border-b-2 group-open/link-settings:border-dashed group-open/link-settings:border-outline [&::-webkit-details-marker]:hidden">
              {t('settings.title')}
              <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open/link-settings:rotate-180" />
            </summary>
            <div className="p-3">
              <JoinLinkSettings slug={group.slug} joinLink={joinLink} />
            </div>
          </details>
        )}
      </CardContent>
      <CardDivider />
      <CardContent>
        <InviteForm slug={group.slug} />
      </CardContent>
    </Card>
  );
};
