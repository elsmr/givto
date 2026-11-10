import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import type { Tone } from '@/components/ui/icon-tile';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export const PrivacySection = ({
  icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  children: ReactNode;
}) => (
  <Card>
    <CardHeader>
      <IconCardTitle icon={icon} tone={tone}>
        {title}
      </IconCardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">{children}</CardContent>
  </Card>
);
