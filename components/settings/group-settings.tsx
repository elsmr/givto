import { appErrorCode } from '@/components/group/app-error-code';
import { GroupNotFound } from '@/components/group/group-not-found';
import { KeepApartSection } from '@/components/group/keep-apart-section';
import { PendingRequests } from '@/components/group/pending-requests';
import { ShareSection } from '@/components/group/share-section';
import { useRequireSession } from '@/components/group/use-require-session';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DangerZone } from './danger-zone';
import { EditionForm } from './edition-form';
import { GroupNameForm } from './group-name-form';
import { PeopleSettings } from './people-settings';
import { RedrawSection } from './redraw-section';

/** /g/[slug]/settings (27): the organizer's place for the group and its current edition. Members get not-found. */
export const GroupSettings = ({ slug }: { slug: string }) => {
  const t = useTranslations('settings');
  const tGroup = useTranslations('group');
  const trpc = useTRPC();
  const user = useRequireSession();
  const group = useQuery({ ...trpc.group.get.queryOptions({ groupSlug: slug }), enabled: !!user });

  if (!user || group.isPending) return <LogoAnimation variant="loading" />;
  if (group.error && appErrorCode(group.error) !== 'GROUP_NOT_FOUND') {
    return (
      <Alert variant="danger">
        <AlertDescription>{tGroup('load-failed')}</AlertDescription>
      </Alert>
    );
  }
  const organizer = group.data?.organizer;
  if (group.error || !organizer) return <GroupNotFound />;

  const { data } = group;
  const { edition } = data;
  const beforeDraw = edition && (edition.status === 'draft' || edition.status === 'open');
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link href={`/g/${slug}`} className="inline-flex items-center gap-1 self-start font-semibold">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t('back', { group: data.name })}
        </Link>
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t('title')}</h1>
      </div>
      <GroupNameForm slug={slug} name={data.name} />
      {edition && <EditionForm key={edition.number} groupSlug={slug} edition={edition} />}
      <PendingRequests group={data} />
      {edition && <PeopleSettings group={data} edition={edition} />}
      {edition && beforeDraw ? (
        <KeepApartSection group={data} edition={edition} organizer={organizer} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{tGroup('keep-apart.title')}</h2>
            </CardTitle>
            <CardDescription>{t('keep-apart-drawn')}</CardDescription>
          </CardHeader>
        </Card>
      )}
      <ShareSection group={data} />
      {edition?.status === 'drawn' && <RedrawSection group={data} edition={edition} />}
      <DangerZone slug={slug} groupName={data.name} />
    </div>
  );
};
