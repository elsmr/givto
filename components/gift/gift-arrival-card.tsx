import { useErrorMessage } from '@/components/wishlist/use-error-message';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** By post (87), on the overview: my gift is on its way once my Santa posted it; "It arrived" lets them know. Never who. */
export const GiftArrivalCard = ({ groupSlug, editionNumber }: { groupSlug: string; editionNumber: number }) => {
  const t = useTranslations('group.arrival');
  const errorMessage = useErrorMessage();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const input = { groupSlug, editionNumber };
  const arrival = useQuery(trpc.gift.arrival.queryOptions(input));
  const save = useMutation(
    trpc.gift.setArrived.mutationOptions({
      onError: (error) => toast.add({ title: errorMessage(error), type: 'error' }),
      onSettled: () => queryClient.invalidateQueries(trpc.gift.arrival.pathFilter()),
    })
  );

  if (!arrival.data?.posted) return null;
  const { arrived } = arrival.data;
  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Truck} tone="yellow">
          {arrived ? t('arrived-title') : t('title')}
        </IconCardTitle>
        <CardDescription>{arrived ? t('arrived-description') : t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {arrived ? (
          <>
            <Badge variant="mint">
              <Check aria-hidden="true" />
              {t('arrived')}
            </Badge>
            <Button variant="ghost" size="sm" disabled={save.isPending} onClick={() => save.mutate({ ...input, arrived: false })}>
              {t('undo')}
            </Button>
          </>
        ) : (
          <Button disabled={save.isPending} onClick={() => save.mutate({ ...input, arrived: true })}>
            {t('mark')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
