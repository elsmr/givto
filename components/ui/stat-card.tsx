import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
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
  /** Makes the card a link. */
  href?: string;
};

/** Overview stat (61): icon tile left, big tabular number right; below, the title left and a small label right. */
export const StatCard = ({ icon, tone, title, value, unit, visual, className, onClick, href }: StatCardProps) => {
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <IconTile icon={icon} tone={tone} />
        <span className="flex min-w-0 items-center gap-3">
          {visual}
          {value !== undefined && <span className="font-heading text-3xl leading-none font-extrabold tabular-nums">{value}</span>}
        </span>
      </span>
      <span className="flex flex-wrap items-end justify-between gap-x-3 gap-y-0.5">
        <span className="font-semibold break-words">{title}</span>
        {unit && <span className="ml-auto text-right text-xs text-muted">{unit}</span>}
      </span>
    </>
  );
  const classes = cn('flex flex-col justify-between gap-3 bg-surface p-4 text-left text-ink bordered shadow-md', className);
  if (href) {
    return (
      <Link href={href} className={cn(classes, 'pressable no-underline')}>
        {body}
      </Link>
    );
  }
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(classes, 'pressable')}>
      {body}
    </button>
  ) : (
    <div className={classes}>{body}</div>
  );
};
