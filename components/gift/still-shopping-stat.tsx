import { StatCard } from '@/components/ui/stat-card';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Send, ShoppingBag } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

/**
 * Organizer (63): how many Santas have their gift, and who's still shopping; by post (87), who hasn't posted theirs.
 * Never what, for whom, or whether it arrived.
 */
export const StillShoppingStat = ({ groupSlug, editionNumber, className }: { groupSlug: string; editionNumber: number; className?: string }) => {
  const t = useTranslations('group.stats');
  const format = useFormatter();
  const trpc = useTRPC();
  const shopping = useQuery(trpc.gift.stillShopping.queryOptions({ groupSlug, editionNumber }));

  if (!shopping.data) return null;
  const { santas, stillShopping, notPosted } = shopping.data;
  return (
    <>
      <StatCard
        icon={ShoppingBag}
        tone="mint"
        title={t('gifts')}
        className={className}
        value={`${santas - stillShopping.length}/${santas}`}
        unit={stillShopping.length > 0 ? t('gifts-still', { names: format.list(stillShopping) }) : t('gifts-all')}
      />
      {notPosted && (
        <StatCard
          icon={Send}
          tone="yellow"
          title={t('posted')}
          className={className}
          value={`${santas - notPosted.length}/${santas}`}
          unit={notPosted.length > 0 ? t('posted-not-yet', { names: format.list(notPosted) }) : t('posted-all')}
        />
      )}
    </>
  );
};
