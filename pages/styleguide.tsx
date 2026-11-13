import { AppShell } from '@/components/shell/app-shell';
import { ButtonsSection } from '@/components/styleguide/buttons-section';
import {
  CardsSection,
  DisclosureSection,
  SettingsGroupSection,
  IconTilesSection,
  StatCardsSection,
} from '@/components/styleguide/cards-section';
import { ChoicesSection } from '@/components/styleguide/choices-section';
import { ColorsSection } from '@/components/styleguide/colors-section';
import { AvatarsSection, BadgesSection } from '@/components/styleguide/display-section';
import { FeedbackSection } from '@/components/styleguide/feedback-section';
import { InputsSection } from '@/components/styleguide/inputs-section';
import { OverlaysSection } from '@/components/styleguide/overlays-section';
import {
  AppNavSection,
  DashboardSection,
  EmptyStateSection,
  PageHeaderSection,
  PhaseStepperSection,
} from '@/components/styleguide/patterns-section';
import { SpacingSection, SurfacesSection } from '@/components/styleguide/surfaces-section';
import { TabsSection } from '@/components/styleguide/tabs-section';
import { TypographySection } from '@/components/styleguide/typography-section';
import { DisclosureCard } from '@/components/ui/disclosure-card';
import { PageHeader } from '@/components/ui/page-header';
import { loadMessages } from '@/messages/load';
import { ListTree } from 'lucide-react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import type { ComponentType } from 'react';

type Part = {
  id: string;
  title: string;
  description: string;
  /** `id` is the section heading's id, the table of contents' anchor. */
  sections: { id: string; label: string; Section: ComponentType }[];
};

const parts: Part[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    description: 'The tokens everything is built from.',
    sections: [
      { id: 'colours', label: 'Colours', Section: ColorsSection },
      { id: 'typography', label: 'Typography', Section: TypographySection },
      { id: 'borders-shadows', label: 'Borders and shadows', Section: SurfacesSection },
      { id: 'spacing', label: 'Spacing', Section: SpacingSection },
    ],
  },
  {
    id: 'components',
    title: 'Components',
    description: 'The pieces in components/ui, in their states.',
    sections: [
      { id: 'buttons', label: 'Buttons', Section: ButtonsSection },
      { id: 'inputs', label: 'Inputs', Section: InputsSection },
      { id: 'choices', label: 'Checkbox and switch', Section: ChoicesSection },
      { id: 'badges', label: 'Badges', Section: BadgesSection },
      { id: 'tabs', label: 'Tabs', Section: TabsSection },
      { id: 'cards', label: 'Cards', Section: CardsSection },
      { id: 'icon-tiles', label: 'Icon tiles', Section: IconTilesSection },
      { id: 'stat-cards', label: 'Stat cards', Section: StatCardsSection },
      { id: 'disclosure-card', label: 'Disclosure card', Section: DisclosureSection },
      { id: 'settings-group', label: 'Settings group', Section: SettingsGroupSection },
      { id: 'feedback', label: 'Alerts and toasts', Section: FeedbackSection },
      { id: 'overlays', label: 'Overlays', Section: OverlaysSection },
      { id: 'avatars', label: 'Avatars', Section: AvatarsSection },
    ],
  },
  {
    id: 'patterns',
    title: 'Patterns',
    description: 'Components put together the way the app pages use them.',
    sections: [
      { id: 'page-header', label: 'Page header', Section: PageHeaderSection },
      { id: 'phase-stepper', label: 'Phase stepper', Section: PhaseStepperSection },
      { id: 'dashboard', label: 'To-dos and group cards', Section: DashboardSection },
      { id: 'empty-state', label: 'Empty state', Section: EmptyStateSection },
      { id: 'app-navigation', label: 'App navigation', Section: AppNavSection },
    ],
  },
];

const TableOfContents = ({ compact = false }: { compact?: boolean }) => (
  <nav aria-label="On this page">
    <ul className="flex flex-col gap-4">
      {parts.map((part) => (
        <li key={part.id} className="flex flex-col gap-1">
          <a href={`#${part.id}`} className="font-bold text-ink no-underline hover:underline">
            {part.title}
          </a>
          <ul className={compact ? 'flex flex-wrap gap-2' : 'flex flex-col'}>
            {part.sections.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={
                    compact
                      ? 'inline-flex min-h-11 items-center bg-surface px-3 text-sm font-semibold text-ink no-underline border-2 border-outline'
                      : 'block py-1 text-sm text-ink no-underline hover:underline'
                  }
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  </nav>
);

// Dev aid: the design system with every UI component in its states. Sample copy is English only.
export default function StyleguidePage() {
  return (
    <AppShell app>
      <Head>
        <title>Styleguide · Givto</title>
      </Head>
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Design system"
          title="Styleguide"
          description="Neobrutalist: square corners, dark outlines, hard shadows and a few colour fills. Start with the foundations, then pick components and patterns."
        />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-start">
          <div className="lg:hidden">
            <DisclosureCard title="On this page" icon={ListTree} tone="yellow">
              <TableOfContents compact />
            </DisclosureCard>
          </div>
          <aside className="hidden lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1 lg:block lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto">
            <TableOfContents />
          </aside>
          <div className="flex min-w-0 flex-col gap-20">
            {parts.map((part) => (
              <section key={part.id} aria-labelledby={part.id} className="flex flex-col gap-12">
                <div className="flex flex-col gap-1 border-b-(length:--border-width) border-outline pb-4">
                  <h2 id={part.id} className="scroll-mt-6 text-4xl font-extrabold">
                    {part.title}
                  </h2>
                  <p className="text-muted">{part.description}</p>
                </div>
                {part.sections.map(({ id, Section }) => (
                  <Section key={id} />
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export const getStaticProps: GetStaticProps = async () => ({
  props: { messages: await loadMessages('en', ['dashboard', 'group']) },
});
