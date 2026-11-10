import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconTile, type Tone } from './icon-tile';

type DisclosureCardProps = { title: string; icon: LucideIcon; tone: Tone; children: ReactNode };

/**
 * A collapsed card for what isn't needed in this phase (61): the header toggles, the body opens inside
 * the same block. Cards passed as children drop their own frame and become sections of this one.
 */
export const DisclosureCard = ({ title, icon, tone, children }: DisclosureCardProps) => (
  <details className="group/disclosure bg-surface text-ink bordered shadow-md">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2 hover:bg-page group-open/disclosure:border-b-2 group-open/disclosure:border-dashed group-open/disclosure:border-outline [&::-webkit-details-marker]:hidden">
      <IconTile icon={icon} tone={tone} className="size-9" />
      <h2 className="flex-1 text-lg leading-tight font-bold">{title}</h2>
      <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open/disclosure:rotate-180" />
    </summary>
    <div className="flex flex-col gap-6 p-4 *:data-[slot=card]:border-0 *:data-[slot=card]:bg-transparent *:data-[slot=card]:shadow-none *:data-[slot=card]:gap-4 *:data-[slot=card]:[--card-spacing:0]">
      {children}
    </div>
  </details>
);
