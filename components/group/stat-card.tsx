import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconTile, type Tone } from './icon-tile';

type StatCardProps = {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  /** The big number (or word), right-aligned. */
  value?: ReactNode;
  /** Small label under the value. */
  unit?: string;
  /** Above the value, or instead of it: something visual (avatars, a ring). */
  visual?: ReactNode;
  className?: string;
  /** Makes the card a button, e.g. to open the matching tab. */
  onClick?: () => void;
};

/** Overview stat (61): icon tile and title on the left, a big tabular number with a small label on the right. */
export const StatCard = ({ icon, tone, title, value, unit, visual, className, onClick }: StatCardProps) => {
  const body = (
    <>
      <span className="flex min-w-0 flex-col items-start gap-2">
        <IconTile icon={icon} tone={tone} />
        <span className="font-semibold break-words">{title}</span>
      </span>
      <span className="flex min-w-0 flex-col items-end gap-1 text-right">
        {visual}
        {value !== undefined && <span className="font-heading text-3xl leading-none font-extrabold tabular-nums">{value}</span>}
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </span>
    </>
  );
  const classes = cn('flex justify-between gap-3 bg-surface p-4 text-left text-ink bordered shadow-md', className);
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(classes, 'pressable')}>
      {body}
    </button>
  ) : (
    <div className={classes}>{body}</div>
  );
};
