import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconTile, type Tone } from './icon-tile';

type DisclosureCardProps = { title: string; icon: LucideIcon; tone: Tone; children: ReactNode };

/** A collapsed bar for what isn't needed in this phase (61); open, its cards show below it. */
export const DisclosureCard = ({ title, icon, tone, children }: DisclosureCardProps) => (
  <details className="group/disclosure">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 bg-surface px-4 py-2 text-ink bordered shadow-md pressable [&::-webkit-details-marker]:hidden">
      <IconTile icon={icon} tone={tone} className="size-9" />
      <h2 className="flex-1 text-lg leading-tight font-bold">{title}</h2>
      <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open/disclosure:rotate-180" />
    </summary>
    <div className="flex flex-col gap-6 pt-4">{children}</div>
  </details>
);
