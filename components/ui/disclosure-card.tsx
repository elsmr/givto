import { cn } from '@/lib/utils';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode, Ref } from 'react';
import { CardTitle } from './card';
import { IconTile, type Tone } from './icon-tile';

type DisclosureCardProps = {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  id?: string;
  className?: string;
  ref?: Ref<HTMLDetailsElement>;
  children: ReactNode;
};

/**
 * A collapsed card for what isn't needed in this phase (61): the header toggles, the body opens inside
 * the same block. Each child is a section, divided; cards passed as children drop their own frame.
 */
export const DisclosureCard = ({ title, description, icon, tone = 'primary-muted', id, className, ref, children }: DisclosureCardProps) => (
  <details ref={ref} id={id} className={cn('group/disclosure scroll-mt-8 bg-surface text-ink bordered shadow-md', className)}>
    <summary className="flex cursor-pointer list-none items-center gap-3 p-6 hover:bg-page group-open/disclosure:border-b-2 group-open/disclosure:border-dashed group-open/disclosure:border-outline [&::-webkit-details-marker]:hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-3">
          {icon && <IconTile icon={icon} tone={tone} />}
          <CardTitle>
            <h2>{title}</h2>
          </CardTitle>
        </div>
        {description && <div className="text-sm text-muted">{description}</div>}
      </div>
      <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open/disclosure:rotate-180" />
    </summary>
    <div className="flex flex-col divide-y-2 divide-dashed divide-outline *:px-6 *:py-4 *:data-[slot=card]:border-0 *:data-[slot=card]:bg-transparent *:data-[slot=card]:shadow-none *:data-[slot=card]:gap-4 *:data-[slot=card]:[--card-spacing:0]">
      {children}
    </div>
  </details>
);
