import { appErrorCode } from '@/components/group/app-error-code';
import { GroupNotFound } from '@/components/group/group-not-found';
import { PendingRequests } from '@/components/group/pending-requests';
import { useRequireSession } from '@/components/auth/use-require-session';
import { LoadFailed } from '@/components/shell/load-failed';
import { buttonVariants } from '@/components/ui/button';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { GuessSettings } from '@/components/guess/guess-settings';
import { RevealSettings } from '@/components/giftday/reveal-settings';
import { DangerZone } from './danger-zone';
import { EditionForm } from './edition-form';
import { GroupNameForm } from './group-name-form';
import { GroupTimeZoneForm } from './group-time-zone-form';
import { KeepApartSection } from './keep-apart-section';
import { PeopleSettings } from './people-settings';
import { RedrawSection } from './redraw-section';
import { PageHeader } from '@/components/ui/page-header';

/** /g/[slug]/settings (27): the organizer's place for the group and its current edition. Members are sent back to the group; others get not-found. */
export const GroupSettings = ({ slug }: { slug: string }) => {
  const t = useTranslations('settings');
  const tGroup = useTranslations('group');
  const trpc = useTRPC();
  const user = useRequireSession();
  const group = useQuery({ ...trpc.group.get.queryOptions({ groupSlug: slug }), enabled: !!user });

  if (!user || group.isPending) return <LogoAnimation variant="loading" />;
  if (group.error && appErrorCode(group.error) !== 'GROUP_NOT_FOUND') {
    return <LoadFailed message={tGroup('load-failed')} onRetry={() => void group.refetch()} />;
  }
  const organizer = group.data?.organizer;
  if (group.data && !organizer) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={t('title')} description={t('only-organizer', { group: group.data.name })} />
        <Link href={`/g/${slug}`} className={buttonVariants({ className: 'self-start' })}>
          {t('back', { group: group.data.name })}
        </Link>
      </div>
    );
  }
  if (group.error || !organizer) return <GroupNotFound />;

  const { data } = group;
  const { edition } = data;
  // Most used first; the danger zone last.
  const sections: { id: string; title: string; content: ReactNode }[] = [
    {
      id: 'group',
      title: t('group-name.title'),
      content: (
        <>
          <GroupNameForm slug={slug} name={data.name} />
          <GroupTimeZoneForm slug={slug} timeZone={data.timeZone} />
        </>
      ),
    },
    ...(edition ? [{ id: 'edition', title: edition.title, content: <EditionForm key={edition.number} groupSlug={slug} edition={edition} /> }] : []),
    {
      id: 'people',
      title: t('people.title'),
      content: (
        <>
          <PendingRequests group={data} />
          <PeopleSettings group={data} edition={edition} />
        </>
      ),
    },
    ...(edition
      ? [
          {
            id: 'gift-day',
            title: t('gift-day'),
            content: (
              <>
                <GuessSettings groupSlug={slug} edition={edition} />
                <RevealSettings groupSlug={slug} edition={edition} />
              </>
            ),
          },
        ]
      : []),
    { id: 'keep-apart', title: tGroup('keep-apart.title'), content: <KeepApartSection group={data} edition={edition} organizer={organizer} /> },
    ...(edition?.status === 'drawn'
      ? [{ id: 'redraw', title: t('redraw.title'), content: <RedrawSection group={data} edition={edition} /> }]
      : []),
    { id: 'danger', title: t('danger.title'), content: <DangerZone slug={slug} groupName={data.name} /> },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={
          <Link href={`/g/${slug}`} className="inline-flex min-h-11 items-center gap-1 font-semibold">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t('back', { group: data.name })}
          </Link>
        }
        title={t('title')}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_13rem] lg:items-start">
        <nav aria-label={t('on-this-page')} className="sticky top-8 hidden lg:col-start-2 lg:row-start-1 lg:block">
          <ul className="divide-y-2 divide-dashed divide-ink/30 bg-surface bordered shadow-md">
            {sections.map(({ id, title }) => (
              <li key={id}>
                <a href={`#${id}`} className="block px-4 py-2.5 font-semibold break-words text-ink no-underline hover:bg-page">
                  {title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          {sections.map(({ id, content }) => (
            <div key={id} id={id} className="flex scroll-mt-8 flex-col gap-8">
              {content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
