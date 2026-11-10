import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import type { Tone } from '@/components/ui/icon-tile';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type AccountSectionProps = {
  title: string;
  icon: LucideIcon;
  tone: Tone;
  description?: string;
  /** A coral card: the muted grey is too light on it. */
  danger?: boolean;
  /** `AccountSubsection`s, with `CardDivider`s between them. */
  children: ReactNode;
};

export const AccountSection = ({ title, icon, tone, description, danger, children }: AccountSectionProps) => (
  <Card className={cn(danger && 'bg-coral')}>
    <CardHeader>
      <IconCardTitle icon={icon} tone={tone}>
        {title}
      </IconCardTitle>
      {description && <CardDescription className={cn('text-base', danger && 'text-ink')}>{description}</CardDescription>}
    </CardHeader>
    {children}
  </Card>
);

type AccountSubsectionProps = { title?: string; description?: string; className?: string; children: ReactNode };

export const AccountSubsection = ({ title, description, className, children }: AccountSubsectionProps) => (
  <CardContent className={cn('flex flex-col gap-4', className)}>
    {title && (
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold">{title}</h3>
        {description && <p className="text-muted">{description}</p>}
      </div>
    )}
    {children}
  </CardContent>
);
