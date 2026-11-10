import { phaseOf } from '@/components/group/edition-phase';
import { PhaseStepper } from '@/components/group/phase-stepper';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardDivider, CardHeader } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { ArrowRight, Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GiftDayCountdown } from './gift-day-label';
import { StatusBadge, type DashboardGroup } from './group-card';

/** The group whose gift day comes first, big: countdown, where it is, the way in. */
export const UpNextCard = ({ group }: { group: DashboardGroup }) => {
  const t = useTranslations('dashboard');
  const { edition } = group;
  const href = `/g/${group.slug}`;

  return (
    <Card className="shadow-brand">
      <CardHeader className="grid-cols-[1fr_auto]">
        <h3 className="min-w-0 text-2xl font-extrabold break-words sm:text-3xl">{group.name}</h3>
        <div className="col-start-2 row-start-1">
          <StatusBadge group={group} />
        </div>
        <CardDescription className="text-base">{edition?.title ?? t('no-edition')}</CardDescription>
      </CardHeader>
      {edition && (
        <CardContent className="grid items-end gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
          <GiftDayCountdown date={edition.giftDay} timeZone={edition.timeZone} size="lg" />
          <PhaseStepper phase={phaseOf(edition.status, edition.participantCount)} />
        </CardContent>
      )}
      <CardDivider />
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        {edition?.gifteeReady ? (
          <p className="flex items-center gap-3 font-semibold">
            <IconTile icon={Gift} tone="mint" className="size-9" />
            {t('giftee-known')}
          </p>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-3">
          {edition?.gifteeReady && (
            <Link href={`${href}#giftee`} className={buttonVariants({ variant: 'neutral' })}>
              <Gift aria-hidden="true" />
              {t('see-giftee')}
            </Link>
          )}
          <Link href={href} className={buttonVariants()}>
            {t('open-group')}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
