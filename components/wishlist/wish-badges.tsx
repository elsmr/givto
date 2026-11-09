import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import type { WishView } from './wish-draft';

export const WishBadges = ({ wish, inBudget = false }: { wish: WishView; inBudget?: boolean }) => {
  const t = useTranslations('wishlist.item');
  const badges = [
    wish.reallyWant && <Badge key="really" variant="coral">{t('really-want')}</Badge>,
    wish.kind === 'surpriseMe' && <Badge key="surprise" variant="yellow">{t('surprise-me')}</Badge>,
    wish.kind === 'donation' && <Badge key="donation" variant="primary-muted">{t('donation')}</Badge>,
    inBudget && <Badge key="budget" variant="mint">{t('in-budget')}</Badge>,
  ].filter(Boolean);
  return badges.length > 0 ? <div className="flex flex-wrap gap-1.5">{badges}</div> : null;
};
