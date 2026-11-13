import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardDivider,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DisclosureCard } from '@/components/ui/disclosure-card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ProgressRow } from '@/components/ui/progress-row';
import { SettingsGroup, SettingsRow, settingsHelpId } from '@/components/ui/settings-group';
import { Switch } from '@/components/ui/switch';
import { StatCard } from '@/components/ui/stat-card';
import { toast } from '@/components/ui/toast';
import { CalendarDays, Gift, Heart, History, Mailbox, PenLine, Settings, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Captioned, StyleguideRow, StyleguideSection } from './styleguide-section';

const tones: { tone: Tone; icon: LucideIcon }[] = [
  { tone: 'primary-muted', icon: Users },
  { tone: 'yellow', icon: CalendarDays },
  { tone: 'mint', icon: Gift },
  { tone: 'coral', icon: Heart },
];

export const CardsSection = () => (
  <StyleguideSection
    id="cards"
    title="Cards"
    description="One card per topic. A dashed CardDivider (a direct child of Card) splits the head from the details. Give at most one card per page the brand shadow; on Card write shadow-brand! (tailwind-merge doesn't know it's a shadow size)."
  >
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Family Secret Santa</CardTitle>
          <CardDescription>Gift day 24 December · 6 people</CardDescription>
        </CardHeader>
        <CardContent>Everyone has added a wish. The draw is on 1 December.</CardContent>
        <CardDivider />
        <CardFooter className="justify-between gap-3">
          <span className="text-sm text-muted">Header, content, divider, footer</span>
          <Button>Open</Button>
        </CardFooter>
      </Card>
      <Card className="shadow-brand!">
        <CardHeader>
          <IconCardTitle icon={Gift} tone="mint">
            Your giftee
          </IconCardTitle>
          <CardDescription>IconCardTitle: a card&apos;s h2 with its icon tile, and the brand shadow.</CardDescription>
        </CardHeader>
        <CardContent className="text-lg font-semibold">You&apos;re buying for Cat.</CardContent>
      </Card>
    </div>
  </StyleguideSection>
);

export const IconTilesSection = () => (
  <StyleguideSection
    id="icon-tiles"
    title="Icon tiles"
    description="A pastel square marking a card, row or stat. Decorative: the text next to it carries the meaning."
  >
    <StyleguideRow label="Tones">
      {tones.map(({ tone, icon }) => (
        <Captioned key={tone} caption={tone}>
          <IconTile icon={icon} tone={tone} />
        </Captioned>
      ))}
      <Captioned caption="size-9 in rows">
        <IconTile icon={Settings} tone="yellow" className="size-9" />
      </Captioned>
    </StyleguideRow>
  </StyleguideSection>
);

export const StatCardsSection = () => (
  <StyleguideSection
    id="stat-cards"
    title="Stat cards"
    description="A big number with a tiny label. With href it's a link, with onClick a button (e.g. to open the matching tab); both press."
  >
    <div className="grid gap-6 xs:grid-cols-2 md:grid-cols-3">
      <Captioned caption="plain">
        <StatCard icon={Users} tone="primary-muted" title="People" value={6} unit="joined" />
      </Captioned>
      <Captioned caption="href: a link">
        <StatCard icon={Heart} tone="coral" title="My wishlist" value={4} unit="wishes" href="#stat-cards" />
      </Captioned>
      <Captioned caption="onClick: a button">
        <StatCard
          icon={Wallet}
          tone="yellow"
          title="Budget"
          value="€20"
          unit="per gift"
          onClick={() => toast.add({ title: 'Stat card pressed', type: 'success' })}
        />
      </Captioned>
    </div>
    <StyleguideRow label="ProgressRow: an organizer's done count, in a <ul>">
      <ul className="w-full max-w-md">
        <ProgressRow icon={Mailbox} tone="yellow" title="Addresses" value="4/6" detail="Still missing: Bob and Eve." />
      </ul>
    </StyleguideRow>
  </StyleguideSection>
);

export const DisclosureSection = () => (
  <StyleguideSection
    id="disclosure-card"
    title="Disclosure card"
    description="A collapsed bar for things rarely needed right now, like past groups. Its content shows below it when open."
  >
    <DisclosureCard title="Earlier (1)" icon={History} tone="primary-muted">
      <Card size="sm">
        <CardContent>Colleagues · Done</CardContent>
      </Card>
    </DisclosureCard>
  </StyleguideSection>
);

export const SettingsGroupSection = () => (
  <StyleguideSection
    id="settings-group"
    title="Settings group"
    description="Related settings under one heading, most important first. A row is the label and what it does, with its control beside it; switches apply at once. Collapsible for what's rarely changed, plain inside a dialog."
  >
    <StyleguideRow label="Card">
      <SettingsGroup title="Gift day" icon={Gift} tone="mint" className="w-full max-w-2xl">
        <SettingsRow label="Guess your Santa" description="Guess the draw; Santas are shown at the turns." htmlFor="sg-guess">
          <Switch id="sg-guess" aria-describedby={settingsHelpId('sg-guess')} defaultChecked />
        </SettingsRow>
        <SettingsRow label="How do you unwrap?" description="In their turn, each person opens all their gifts." htmlFor="sg-mode">
          <NativeSelect id="sg-mode" aria-describedby={settingsHelpId('sg-mode')} defaultValue="all">
            <NativeSelectOption value="all">All at once</NativeSelectOption>
            <NativeSelectOption value="one">One by one</NativeSelectOption>
          </NativeSelect>
        </SettingsRow>
        <SettingsRow label="Re-draw" description="Draw all names again.">
          <Button variant="neutral">Re-draw names</Button>
        </SettingsRow>
      </SettingsGroup>
    </StyleguideRow>
    <StyleguideRow label="Collapsible">
      <SettingsGroup title="Group" icon={PenLine} collapsible className="w-full max-w-2xl">
        <SettingsRow label="Rarely changed" description="Opens on click." />
      </SettingsGroup>
    </StyleguideRow>
    <StyleguideRow label="Plain (in a dialog)">
      <div className="w-full max-w-xl bg-surface p-6 bordered">
        <SettingsGroup variant="plain" title="Turns">
          <SettingsRow label="Skip the spin" htmlFor="sg-skip">
            <Switch id="sg-skip" />
          </SettingsRow>
        </SettingsGroup>
      </div>
    </StyleguideRow>
  </StyleguideSection>
);
