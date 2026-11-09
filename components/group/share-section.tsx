import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import type { GroupData } from './group-data';
import { InviteForm } from './invite-form';
import { JoinLinkSettings } from './join-link-settings';
import { SharePanel } from './share-panel';

/** Organizer: joined counter, the join link and its settings, email invites (45). `primary`: getting people in is the next step. */
export const ShareSection = ({ group, primary }: { group: GroupData; primary: boolean }) => {
  const t = useTranslations('group.share');
  const joinLink = group.organizer?.joinLink;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription>{t('joined', { count: group.joinedCount })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {joinLink && !joinLink.revoked ? (
          <SharePanel slug={group.slug} token={joinLink.token} groupName={group.name} locale={group.locale} primary={primary} />
        ) : (
          <Alert>
            <AlertDescription>{t('revoked')}</AlertDescription>
          </Alert>
        )}
        {joinLink && (
          <details>
            <summary className="cursor-pointer font-semibold">{t('settings.title')}</summary>
            <div className="pt-4">
              <JoinLinkSettings slug={group.slug} joinLink={joinLink} />
            </div>
          </details>
        )}
        <InviteForm slug={group.slug} />
      </CardContent>
    </Card>
  );
};
