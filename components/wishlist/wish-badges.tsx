import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { WishView } from './wish-draft';

/** The wish's flags, plus `status` from the view (e.g. "Hidden here", "You got this"). */
export const WishBadges = ({ wish, inBudget = false, status }: { wish: WishView; inBudget?: boolean; status?: ReactNode }) => {
  const t = useTranslations('wishlist.item');
  const badges = [
    wish.reallyWant && <Badge key="really" variant="coral">{t('really-want')}</Badge>,
    wish.kind === 'surpriseMe' && <Badge key="surprise" variant="yellow">{t('surprise-me')}</Badge>,
    wish.kind === 'donation' && <Badge key="donation" variant="primary-muted">{t('donation')}</Badge>,
    inBudget && <Badge key="budget" variant="mint">{t('in-budget')}</Badge>,
  ].filter(Boolean);
  return badges.length > 0 || status ? (
    <div className="flex flex-wrap items-center gap-1.5">
      {badges}
      {status}
    </div>
  ) : null;
};
