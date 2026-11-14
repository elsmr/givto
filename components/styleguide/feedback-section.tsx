import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { Check, CircleAlert, Info, Sparkles } from 'lucide-react';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

export const FeedbackSection = () => (
  <StyleguideSection
    id="feedback"
    title="Alerts, toasts and loading"
    description="Alerts stay on the page while something is true; toasts confirm what just happened. While a page's data loads, skeletons hold its layout (/app, /wishlist, /account, the group and its settings); the logo animation is for flows and steps in between (sign-in link, join, create, the presenter)."
  >
    <div className="flex max-w-xl flex-col gap-4">
      <Alert>
        <Info aria-hidden="true" />
        <AlertTitle>The draw is on 1 December</AlertTitle>
        <AlertDescription>People can still join until then.</AlertDescription>
      </Alert>
      <Alert variant="yellow">
        <Sparkles aria-hidden="true" />
        <AlertTitle>Psst!</AlertTitle>
        <AlertDescription>Your Santa would love some ideas.</AlertDescription>
      </Alert>
      <Alert variant="mint">
        <Check aria-hidden="true" />
        <AlertTitle>Everyone has unwrapped.</AlertTitle>
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
    <StyleguideRow label="Logo animation">
      <LogoAnimation variant="loading" />
      <LogoAnimation variant="celebrate" />
    </StyleguideRow>
    <StyleguideRow label="Skeleton">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    </StyleguideRow>
  </StyleguideSection>
);
