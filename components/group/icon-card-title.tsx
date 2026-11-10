import { CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconTile, type Tone } from './icon-tile';

/** A card's h2 with its pastel icon tile in front (61). */
export const IconCardTitle = ({ icon, tone, children }: { icon: LucideIcon; tone: Tone; children: ReactNode }) => (
  <div className="flex items-center gap-3">
    <IconTile icon={icon} tone={tone} />
    <CardTitle>
      <h2>{children}</h2>
    </CardTitle>
  </div>
);
