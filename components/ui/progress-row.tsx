import type { LucideIcon } from 'lucide-react';
import { IconTile, type Tone } from './icon-tile';

type ProgressRowProps = { icon: LucideIcon; tone: Tone; title: string; value: string; detail: string };

/** One "how many are done" line for the organizer, e.g. "Got their gift 2/3" with who's left under it. Goes in a `<ul>`. */
export const ProgressRow = ({ icon, tone, title, value, detail }: ProgressRowProps) => (
  <li className="flex items-start gap-3">
    <IconTile icon={icon} tone={tone} className="size-9" />
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{title}</span>
        <span className="mono text-lg font-extrabold tabular-nums">{value}</span>
      </span>
      <span className="text-sm break-words text-muted">{detail}</span>
    </div>
  </li>
);
