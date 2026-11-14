import { appErrorCode } from '@/components/group/app-error-code';
import { GroupNotFound } from '@/components/group/group-not-found';
import { PendingRequests } from '@/components/group/pending-requests';
import { useRequireSession } from '@/components/auth/use-require-session';
import { LoadFailed } from '@/components/shell/load-failed';
import { buttonVariants } from '@/components/ui/button';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Gift, PenLine, Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { GuessSetting } from '@/components/guess/guess-settings';
import { RevealSetting } from '@/components/giftday/reveal-settings';
import { UnwrapModeSetting } from '@/components/giftday/unwrap-mode-setting';
import { useGiftDay } from '@/components/giftday/use-gift-day';
import { SettingsGroup } from '@/components/ui/settings-group';
import type { GroupEdition } from '@/components/group/group-data';
import { drawsNames, isBeforeDraw } from '@/lib/schema/edition';
import { AvoidPreviousSetting } from './avoid-previous-setting';
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
  const group = useQuery(trpc.group.get.queryOptions({ groupSlug: slug }));

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
  const sections: { id: string; title: string; content: ReactNode }[] = [
    ...(edition
      ? [
          {
            id: 'edition',
            title: edition.title,
            content: (
              <SettingsGroup id="edition" title={t('edition.title', { edition: edition.title })} icon={CalendarDays} tone="mint">
                <EditionForm key={edition.number} groupSlug={slug} edition={edition} />
              </SettingsGroup>
            ),
          },
        ]
      : []),
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
    // A white elephant (88) has no draw, and nothing to set for gift day but its date.
    ...(edition && !drawsNames(edition)
      ? []
      : [
          {
            id: 'draw',
            title: t('draw-title'),
            content: (
              <SettingsGroup id="draw" title={t('draw-title')} icon={Shuffle} tone="yellow">
                {edition?.hasPreviousEdition && isBeforeDraw(edition) && <AvoidPreviousSetting groupSlug={slug} edition={edition} />}
                <KeepApartSection group={data} edition={edition} organizer={organizer} />
                {edition?.status === 'drawn' && <RedrawSection group={data} edition={edition} />}
              </SettingsGroup>
            ),
          },
          ...(edition ? [{ id: 'gift-day', title: t('gift-day'), content: <GiftDaySettings groupSlug={slug} edition={edition} /> }] : []),
        ]),
    {
      id: 'group',
      title: t('group-name.title'),
      content: (
        <SettingsGroup id="group" title={t('group-name.title')} icon={PenLine} collapsible>
          <GroupNameForm slug={slug} name={data.name} />
          <GroupTimeZoneForm slug={slug} timeZone={data.timeZone} />
        </SettingsGroup>
      ),
    },
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
          <ul className="divide-y-2 divide-dashed divide-outline bg-surface bordered shadow-md">
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
            <Fragment key={id}>{content}</Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

/** The unwrap mode comes with the gift day view, which `useGiftDay` loads from the draw on. */
const GiftDaySettings = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const t = useTranslations('settings');
  const giftDay = useGiftDay({ groupSlug, editionNumber: edition.number }, edition.status);
  const order = giftDay.data?.unwrapOrder;

  return (
    <SettingsGroup id="gift-day" title={t('gift-day')} icon={Gift} tone="mint">
      {giftDay.data && edition.status !== 'done' && (
        <UnwrapModeSetting
          groupSlug={groupSlug}
          editionNumber={edition.number}
          mode={giftDay.data.unwrapMode}
          inProgress={Boolean(order?.started && !order.finished)}
        />
      )}
      <GuessSetting groupSlug={groupSlug} edition={edition} />
      <RevealSetting groupSlug={groupSlug} edition={edition} />
    </SettingsGroup>
  );
};
