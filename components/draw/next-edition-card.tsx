import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { knownAppError } from '../group/app-error-code';
import type { GroupEdition } from '../group/group-data';
import { useRefreshEdition } from './use-refresh-edition';

/** Organizer, once the current edition is drawn: "Same again next year" (33) → draft in settings. */
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
  const errorCode = start.error && knownAppError(start.error, ['EDITION_IN_PROGRESS'] as const);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
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
