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
    <p className="flex items-center gap-2 bg-surface px-4 py-2 text-lg font-semibold bordered">
      <Gift aria-hidden="true" className="size-5" />
      {t('to-open', { count })}
    </p>
  );
};
