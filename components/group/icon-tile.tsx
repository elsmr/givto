import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const tones = { 'primary-muted': 'bg-primary-muted', yellow: 'bg-yellow', mint: 'bg-mint', coral: 'bg-coral' } as const;
export type Tone = keyof typeof tones;

/** A square pastel tile with an icon, the group home's card marker (61). Decorative. */
export const IconTile = ({ icon: Icon, tone, className }: { icon: LucideIcon; tone: Tone; className?: string }) => (
  <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center border-2 border-ink text-ink', tones[tone], className)}>
    <Icon className="size-5" />
  </span>
);
