import { IconCardTitle } from '@/components/group/icon-card-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import { useTRPC } from '@/lib/client/trpc';
import { todayIn } from '@/lib/local-date';
import { useMutation } from '@tanstack/react-query';
import { Repeat } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { knownAppError } from '../group/app-error-code';
import type { GroupEdition } from '../group/group-data';
import { useRefreshEdition } from './use-refresh-edition';

/**
 * Organizer, once the current edition is drawn and gift day has passed: "Same again next year"
 * (33) → draft in settings. Not before gift day: the new edition would push this year's giftees
 * off the group home.
 */
export const NextEditionCard = ({ groupSlug, edition }: { groupSlug: string; edition: GroupEdition }) => {
  const t = useTranslations('draw.next');
  const trpc = useTRPC();
  const router = useRouter();
  const refresh = useRefreshEdition(groupSlug);
  const start = useMutation(
    trpc.edition.startNext.mutationOptions({
      onSuccess: async () => {
        await refresh();
        await router.push(`/g/${groupSlug}/settings`);
      },
    })
  );
  const year = edition.year + 1;
  const upcoming = edition.status !== 'done' && edition.giftDay && edition.giftDay.date >= todayIn(edition.timeZone);
  const errorCode = start.error && knownAppError(start.error, ['EDITION_IN_PROGRESS'] as const);

  if (upcoming) return null;
  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Repeat} tone="primary-muted">
          {t('title')}
        </IconCardTitle>
        <CardDescription>{t('description', { year })}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {errorCode && <FieldError>{t(`errors.${errorCode}`)}</FieldError>}
        <Button variant="neutral" className="self-start" disabled={start.isPending} onClick={() => start.mutate({ groupSlug })}>
          {t('start', { year })}
        </Button>
      </CardContent>
    </Card>
  );
};
