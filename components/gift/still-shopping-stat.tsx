import { ProgressRow } from '@/components/ui/progress-row';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Send, ShoppingBag } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

/**
 * Organizer (63): how many Santas have their gift, and who's still shopping; by post (87), who hasn't posted theirs.
 * Never what, for whom, or whether it arrived.
 */
export const StillShoppingRows = ({ groupSlug, editionNumber }: { groupSlug: string; editionNumber: number }) => {
  const t = useTranslations('group.stats');
  const format = useFormatter();
  const trpc = useTRPC();
  const shopping = useQuery(trpc.gift.stillShopping.queryOptions({ groupSlug, editionNumber }));

  if (!shopping.data) return null;
  const { santas, stillShopping, notPosted } = shopping.data;
  return (
    <>
      <ProgressRow
        icon={ShoppingBag}
        tone="mint"
        title={t('gifts')}
        value={`${santas - stillShopping.length}/${santas}`}
        detail={stillShopping.length > 0 ? t('gifts-still', { names: format.list(stillShopping) }) : t('gifts-all')}
      />
      {notPosted && (
        <ProgressRow
          icon={Send}
          tone="yellow"
          title={t('posted')}
          value={`${santas - notPosted.length}/${santas}`}
          detail={notPosted.length > 0 ? t('posted-not-yet', { names: format.list(notPosted) }) : t('posted-all')}
        />
      )}
    </>
  );
};
