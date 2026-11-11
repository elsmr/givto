import { EmptyState } from '@/components/dashboard/empty-state';
import { GroupCard, type DashboardGroup } from '@/components/dashboard/group-card';
import { TodoList } from '@/components/dashboard/todo-list';
import { phases } from '@/components/group/edition-phase';
import { PhaseStepper } from '@/components/group/phase-stepper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, Plus, Settings } from 'lucide-react';
import { useSyncExternalStore, type ReactNode } from 'react';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

const Frame = ({ children }: { children: ReactNode }) => (
  <div className="w-full bg-page p-4 bordered sm:p-6">{children}</div>
);

const subscribeToNothing = () => () => {};
// The countdown depends on today: the static HTML renders without a gift day, the browser fills it in.
const useGiftDayIn = (days: number) =>
  useSyncExternalStore(
    subscribeToNothing,
    () => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10),
    () => undefined,
  );

const sampleGroups = (giftDay: string | undefined): DashboardGroup[] => [
  {
    slug: 'family',
    name: 'Family',
    role: 'member',
    archived: false,
    edition: { number: 3, title: 'Christmas 2026', kind: 'secretSanta', year: 2026, status: 'drawn', giftDay, timeZone: 'UTC', participantCount: 6, gifteeReady: true },
    todos: [{ kind: 'question', count: 1 }],
    shownWishIds: [],
  },
  {
    slug: 'book-club',
    name: 'Book club',
    role: 'organizer',
    archived: false,
    edition: { number: 1, title: 'Winter swap', kind: 'secretSanta', year: 2026, status: 'open', giftDay: undefined, timeZone: 'UTC', participantCount: 4, gifteeReady: false },
    todos: [{ kind: 'joinRequests', count: 2 }, { kind: 'readyToDraw' }, { kind: 'noWishes' }],
    shownWishIds: [],
  },
];

export const PageHeaderSection = () => (
  <StyleguideSection
    id="page-header"
    title="Page header"
    description="Every page's h1 is a PageHeader. Actions sit right of the title from 480px and under it on phones; an eyebrow greets or leads back; chips under the title give the context."
  >
    <StyleguideRow label="Plain: title and description">
      <Frame>
        <PageHeader title="My wishlist" description="One list for all your groups. Hide a wish from a group in its wishlist tab." />
      </Frame>
    </StyleguideRow>
    <StyleguideRow label="Eyebrow and actions">
      <Frame>
        <PageHeader
          eyebrow={
            <a href="#page-header" className="inline-flex min-h-11 items-center gap-1 font-semibold">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to Family
            </a>
          }
          title="Settings"
          actions={
            <Button variant="neutral">
              <Plus aria-hidden="true" />
              Invite people
            </Button>
          }
        />
      </Frame>
    </StyleguideRow>
    <StyleguideRow label="Chips">
      <Frame>
        <PageHeader
          eyebrow="Hi Ann"
          title="Family"
          actions={
            <Button variant="neutral">
              <Settings aria-hidden="true" />
              Settings
            </Button>
          }
        >
          <p className="font-semibold">Christmas 2026</p>
          <Badge variant="mint">€20 budget</Badge>
          <Badge variant="primary-muted">Everyone gives to one person</Badge>
        </PageHeader>
      </Frame>
    </StyleguideRow>
  </StyleguideSection>
);

export const PhaseStepperSection = () => (
  <StyleguideSection
    id="phase-stepper"
    title="Phase stepper"
    description="Where an edition is: past phases mint and ticked, the current one yellow and raised, the rest dashed. A status, not navigation."
  >
    <ul className="flex flex-col gap-6">
      {phases.map((phase) => (
        <li key={phase} className="flex flex-col gap-2">
          <code className="text-xs text-muted">phase=&quot;{phase}&quot;</code>
          <PhaseStepper phase={phase} />
        </li>
      ))}
    </ul>
  </StyleguideSection>
);

export const DashboardSection = () => {
  const groups = sampleGroups(useGiftDayIn(12));

  return (
    <StyleguideSection
      id="dashboard"
      title="To-dos and group cards"
      description="The home page's building blocks, rendered by the real components from sample groups. A to-do row has one action and dashed rules between rows; the whole group card is one link."
    >
      <StyleguideRow label="TodoList">
        <div className="w-full">
          <TodoList groups={groups} />
        </div>
      </StyleguideRow>
      <StyleguideRow label="TodoList with nothing to do">
        <div className="w-full">
          <TodoList groups={[]} />
        </div>
      </StyleguideRow>
      <StyleguideRow label="GroupCard">
        <ul className="grid w-full gap-6 sm:grid-cols-2">
          {groups.map((group) => (
            <li key={group.slug}>
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      </StyleguideRow>
    </StyleguideSection>
  );
};

export const EmptyStateSection = () => (
  <StyleguideSection
    id="empty-state"
    title="Empty state"
    description="When there's nothing yet: say why it's empty and give the one action that fills it."
  >
    <EmptyState />
  </StyleguideSection>
);

export const AppNavSection = () => (
  <StyleguideSection
    id="app-navigation"
    title="App navigation"
    description="The navigation around this page. Signed-in pages use AppShell app."
  >
    <ul className="flex max-w-prose list-disc flex-col gap-2 pl-5">
      <li>From 768px a rail on the left with the logo; on phones a bar stuck to the bottom, with the logo in a slim top bar.</li>
      <li>Three items: Home (also group pages and starting a group), Wishlist and Account. Sign out lives on Account.</li>
      <li>The current item is yellow and raised with a small shadow, like the active segment of a segmented control. None is current here: the styleguide isn&apos;t one of them.</li>
      <li>Signed-out pages use AppShell without app: the public header and footer.</li>
    </ul>
  </StyleguideSection>
);
