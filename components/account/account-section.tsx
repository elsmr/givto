import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import type { ReactNode } from 'react';

export const AccountSection = ({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) => (
  <Card role="region" aria-labelledby={`${id}-title`} id={id} className="scroll-mt-4">
    <CardHeader>
      <h2 id={`${id}-title`} className="text-2xl font-bold">
        {title}
      </h2>
      {description && <CardDescription className="text-base">{description}</CardDescription>}
    </CardHeader>
    <CardContent className="flex flex-col gap-4">{children}</CardContent>
  </Card>
);
