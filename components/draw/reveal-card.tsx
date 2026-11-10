import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import * as m from 'motion/react-m';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef, type ReactNode } from 'react';
import { useGifteeRevealed } from './use-giftee-revealed';

type RevealCardProps = { groupSlug: string; editionNumber: number; timeZone: string; children?: ReactNode };

/** "You're buying for …", hidden until tapped so it isn't read over a shoulder. Only my own giftee. `children`: shown with the name. */
export const RevealCard = ({ groupSlug, editionNumber, timeZone, children }: RevealCardProps) => {
  const t = useTranslations('draw.reveal');
  const format = useFormatter();
  const trpc = useTRPC();
  const mine = useQuery(trpc.draw.mine.queryOptions({ groupSlug, editionNumber }));
  const seenChange = useMutation(trpc.draw.seenChange.mutationOptions());
  const [shown, setShown] = useGifteeRevealed(groupSlug, editionNumber);
  // Tapping swaps the reveal button for "Hide" and back: keep keyboard focus on whichever is there.
  const toggleButton = useRef<HTMLButtonElement>(null);
  const toggled = useRef(false);
  useEffect(() => {
    if (toggled.current) toggleButton.current?.focus();
  }, [shown]);
  const toggle = (next: boolean) => {
    toggled.current = true;
    setShown(next);
  };

  if (mine.isPending) return <Skeleton className="h-48" />;
  if (!mine.data) return null;
  const { inEdition, giftee, changedAt } = mine.data;
  if (!giftee) {
    return (
      <Card>
        <CardContent>
          <p>{t(inEdition ? 'not-fitted' : 'not-in')}</p>
        </CardContent>
      </Card>
    );
  }

  const reveal = () => {
    toggle(true);
    if (changedAt) seenChange.mutate({ groupSlug, editionNumber });
  };
  return (
    // Card sets shadow-md; the brand shadow must win (tailwind-merge doesn't know `shadow-brand` is a shadow size).
    <Card className="shadow-brand!">
      <CardHeader>
        <IconCardTitle icon={Gift} tone="primary-muted">
          {t('title')}
        </IconCardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {changedAt && (
          <Alert>
            <AlertDescription>{t('changed', { date: format.dateTime(changedAt, { dateStyle: 'long', timeZone }) })}</AlertDescription>
          </Alert>
        )}
        {/* Both states in one cell, so revealing doesn't change the card's height. The name is only in the page once shown. */}
        <div className="grid *:col-start-1 *:row-start-1">
          <m.div
            inert={!shown}
            initial={false}
            animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            className={cn('flex flex-col items-center gap-2 py-4 text-center', !shown && 'invisible')}
          >
            <p className="font-semibold text-muted">{t('buying-for')}</p>
            <p className="font-heading text-4xl font-extrabold break-words sm:text-5xl">{shown ? giftee.name : '\u00a0'}</p>
            {children}
            <Button ref={shown ? toggleButton : undefined} variant="ghost" onClick={() => toggle(false)}>
              {t('hide')}
            </Button>
          </m.div>
          <button
            ref={shown ? undefined : toggleButton}
            type="button"
            inert={shown}
            onClick={reveal}
            className={cn(
              'flex min-h-40 flex-col items-center justify-center gap-2 bg-primary p-6 text-center text-white bordered shadow-md pressable',
              shown && 'invisible'
            )}
          >
            <Gift aria-hidden="true" className="size-10" />
            <span className="text-xl font-bold">{t('tap')}</span>
            <span className="text-sm">{t('hint')}</span>
          </button>
        </div>
        <p aria-live="polite" className="sr-only">
          {shown ? `${t('buying-for')} ${giftee.name}` : ''}
        </p>
      </CardContent>
    </Card>
  );
};
