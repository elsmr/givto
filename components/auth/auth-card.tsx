import { FlowPage } from '@/components/shell/flow-page';
import { Card, CardContent } from '@/components/ui/card';
import type { ReactNode } from 'react';

export const AuthCard = ({ title, intro, children }: { title: string; intro: string; children: ReactNode }) => (
  <FlowPage title={title} description={intro}>
    <Card>
      <CardContent>{children}</CardContent>
    </Card>
  </FlowPage>
);
