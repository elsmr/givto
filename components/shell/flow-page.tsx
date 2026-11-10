import { Card, CardContent, CardDivider, CardFooter } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import type { ComponentProps, ReactNode } from 'react';

type FlowPageProps = Omit<ComponentProps<typeof PageHeader>, 'children' | 'actions' | 'className'> & {
  /** One card: the step's form, or a `MessageCard`. */
  children: ReactNode;
};

/** A focused page (sign-in, join, create, errors): a centred column with the heading, then one card. */
export const FlowPage = ({ children, ...header }: FlowPageProps) => (
  <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
    <PageHeader {...header} />
    {children}
  </div>
);

/** What happened, then the ways on below a dashed rule. */
export const MessageCard = ({ children, actions }: { children: ReactNode; actions: ReactNode }) => (
  <Card>
    <CardContent className="flex flex-col gap-3 text-lg">{children}</CardContent>
    <CardDivider />
    <CardFooter className="flex-col items-stretch gap-3 xs:flex-row xs:flex-wrap">{actions}</CardFooter>
  </Card>
);
