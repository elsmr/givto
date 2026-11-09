import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { CircleAlert, Info } from 'lucide-react';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

export const FeedbackSection = () => (
  <StyleguideSection id="feedback" title="Alerts, toasts and loading">
    <div className="flex max-w-xl flex-col gap-4">
      <Alert>
        <Info aria-hidden="true" />
        <AlertTitle>The draw is on 1 December</AlertTitle>
        <AlertDescription>People can still join until then.</AlertDescription>
      </Alert>
      <Alert variant="danger">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>A draw isn&apos;t possible yet</AlertTitle>
        <AlertDescription>
          Ann, Bob and Cat can only give to Dan.
        </AlertDescription>
      </Alert>
    </div>
    <StyleguideRow label="Toasts">
      <Button
        variant="neutral"
        onClick={() =>
          toast.add({
            title: 'Wish saved',
            description: 'Your Santa can see it now.',
            type: 'success',
          })
        }
      >
        Success toast
      </Button>
      <Button
        variant="neutral"
        onClick={() =>
          toast.add({
            title: "Couldn't save",
            description: 'Check your connection.',
            type: 'error',
          })
        }
      >
        Error toast
      </Button>
    </StyleguideRow>
    <StyleguideRow label="Skeleton">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    </StyleguideRow>
  </StyleguideSection>
);
