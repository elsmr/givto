import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import type { ReactNode } from 'react';

export const AuthCard = ({ title, intro, children }: { title: string; intro: string; children: ReactNode }) => (
  <Card className="mx-auto w-full max-w-md">
    <CardHeader>
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <CardDescription className="text-base">{intro}</CardDescription>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);
