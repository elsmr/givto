import { cn } from '@/lib/utils';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { IconTile, type Tone } from './icon-tile';
import { Label } from './label';

type SettingsGroupProps = {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  /** `plain` inside something that's already framed, like a dialog: no card, an h3. */
  variant?: 'card' | 'plain';
  /** Starts closed: for what's rarely changed. Card only. */
  collapsible?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
};

/** Related settings under one heading, most important first: each child is a `SettingsRow` (or any block), divided. */
export const SettingsGroup = ({ title, description, icon, tone = 'primary-muted', variant = 'card', collapsible = false, id, className, children }: SettingsGroupProps) => {
  const headingId = useId();
  const plain = variant === 'plain';
  const Heading = plain ? 'h3' : 'h2';
  const header = (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center gap-3">
        {icon && <IconTile icon={icon} tone={tone} className={plain ? 'size-8' : undefined} />}
        <Heading id={headingId} className={plain ? 'text-base font-bold' : 'font-heading text-xl leading-tight font-bold'}>
          {title}
        </Heading>
      </div>
      {description && <div className="text-sm text-muted">{description}</div>}
    </div>
  );
  const rows = (
    <div
      className={cn(
        'flex flex-col divide-y-2 divide-dashed divide-ink/30',
        plain ? '*:py-3 *:first:pt-0 *:last:pb-0' : 'border-t-2 border-dashed border-ink/30 *:px-6 *:py-4'
      )}
    >
      {children}
    </div>
  );

  if (plain) {
    return (
      <section id={id} aria-labelledby={headingId} className={cn('flex flex-col gap-3', className)}>
        {header}
        {rows}
      </section>
    );
  }
  const frame = cn('scroll-mt-8 bg-surface text-ink bordered shadow-md', className);
  if (collapsible) {
    return (
      <details id={id} className={cn('group/settings', frame)}>
        <summary className="flex cursor-pointer list-none items-center gap-3 p-6 hover:bg-page [&::-webkit-details-marker]:hidden">
          {header}
          <ChevronDown aria-hidden="true" className="size-5 shrink-0 transition-transform group-open/settings:rotate-180" />
        </summary>
        {rows}
      </details>
    );
  }
  return (
    <section id={id} aria-labelledby={headingId} className={frame}>
      <div className="p-6">{header}</div>
      {rows}
    </section>
  );
};

type SettingsRowProps = {
  label: ReactNode;
  description?: ReactNode;
  /** The control's id: the label names it, and it should set `aria-describedby={settingsHelpId(id)}`. Leave out when the control names itself (a button). */
  htmlFor?: string;
  /** The control, beside the label; it wraps under it when there's no room. */
  children?: ReactNode;
  /** Shown under the label and control, full width: an editor or a list. */
  below?: ReactNode;
};

export const settingsHelpId = (controlId: string) => `${controlId}-help`;

/** One setting: what it is and what it does on the left, its control on the right. */
export const SettingsRow = ({ label, description, htmlFor, children, below }: SettingsRowProps) => {
  const rowId = useId();
  const labelId = `${rowId}-label`;
  const descriptionId = htmlFor ? settingsHelpId(htmlFor) : `${rowId}-help`;
  // A labelled control already carries the name; a group would say it twice.
  const group = htmlFor ? {} : { role: 'group', 'aria-labelledby': labelId, 'aria-describedby': description ? descriptionId : undefined };
  return (
    <div {...group} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-40 flex-col gap-1">
          {htmlFor ? (
            <Label htmlFor={htmlFor} className="text-base">
              {label}
            </Label>
          ) : (
            <span id={labelId} className="font-semibold leading-snug">
              {label}
            </span>
          )}
          {description && (
            <p id={descriptionId} className="text-sm text-muted">
              {description}
            </p>
          )}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
      {below}
    </div>
  );
};
