import { phaseOf } from '@/components/group/edition-phase';
import { PhaseStepper } from '@/components/group/phase-stepper';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardDivider, CardHeader } from '@/components/ui/card';
import { ArrowRight, Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GiftDayCountdown } from './gift-day-label';
import type { DashboardGroup } from './group-card';

/** The group whose gift day comes first, big: countdown, where it is, the way in. */
export const UpNextCard = ({ group }: { group: DashboardGroup }) => {
  const t = useTranslations('dashboard');
  const { edition } = group;
  const href = `/g/${group.slug}`;

  return (
    <Card className="shadow-brand!">
      <CardHeader>
        <h3 className="min-w-0 text-2xl font-extrabold break-words sm:text-3xl">{group.name}</h3>
        <CardDescription className="text-base">{edition?.title ?? t('no-edition')}</CardDescription>
      </CardHeader>
      {edition && (
        <CardContent className="grid items-end gap-6 sm:grid-cols-[auto_1fr] sm:gap-10">
          <GiftDayCountdown date={edition.giftDay} timeZone={edition.timeZone} size="lg" />
          <PhaseStepper phase={phaseOf(edition.status, edition.participantCount)} kind={edition.kind} />
        </CardContent>
      )}
      <CardDivider />
      <CardContent className="flex flex-wrap justify-end gap-3">
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
      </CardContent>
    </Card>
  );
};
