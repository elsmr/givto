import { IconCardTitle } from '@/components/group/icon-card-title';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
        {shown ? (
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2 py-4 text-center"
          >
            <p className="font-semibold text-muted">{t('buying-for')}</p>
            <p className="font-heading text-4xl font-extrabold break-words sm:text-5xl">{giftee.name}</p>
            {children}
            <Button ref={toggleButton} variant="ghost" onClick={() => toggle(false)}>
              {t('hide')}
            </Button>
          </m.div>
        ) : (
          <button
            ref={toggleButton}
            type="button"
            onClick={reveal}
            className="flex min-h-40 flex-col items-center justify-center gap-2 bg-primary p-6 text-center text-white bordered shadow-md pressable"
          >
            <Gift aria-hidden="true" className="size-10" />
            <span className="text-xl font-bold">{t('tap')}</span>
            <span className="text-sm">{t('hint')}</span>
          </button>
        )}
        <p aria-live="polite" className="sr-only">
          {shown ? `${t('buying-for')} ${giftee.name}` : ''}
        </p>
      </CardContent>
    </Card>
  );
};
