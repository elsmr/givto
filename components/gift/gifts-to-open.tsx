import { Alert, AlertTitle } from '@/components/ui/alert';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Gift day (63): "3 gifts to open", from what my Santa marked; nothing when they marked nothing. */
export const GiftsToOpen = ({ groupSlug, editionNumber }: { groupSlug: string; editionNumber: number }) => {
  const t = useTranslations('giftday.hero');
  const trpc = useTRPC();
  const toOpen = useQuery(trpc.gift.toOpen.queryOptions({ groupSlug, editionNumber }));
  const count = toOpen.data?.count;

  if (!count) return null;
  return (
    <Alert>
      <Gift aria-hidden="true" />
      <AlertTitle>{t('to-open', { count })}</AlertTitle>
    </Alert>
  );
};
