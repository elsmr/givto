import { ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatPrice } from './format-price';
import { WishBadges } from './wish-badges';
import type { WishView } from './wish-draft';
import { WishImage } from './wish-image';

/** One wish, read-only. Everything is rendered as text (03 XSS); links are http(s) only (schema). */
export const WishSummary = ({ wish, inBudget }: { wish: WishView; inBudget?: boolean }) => {
  const t = useTranslations('wishlist');
  const locale = useLocale();
  const details = [wish.variant, wish.price && formatPrice(wish.price, locale)].filter(Boolean).join(' · ');

  return (
    <div className="flex min-w-0 flex-1 gap-3">
      {wish.imageId && <WishImage imageId={wish.imageId} alt={t('form.image-alt', { title: wish.title })} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="font-sans text-lg leading-snug font-bold break-words">{wish.title}</h3>
        <WishBadges wish={wish} inBudget={inBudget} />
        {details && <p className="text-sm text-muted">{details}</p>}
        {wish.description && <p className="text-sm break-words whitespace-pre-line">{wish.description}</p>}
        {wish.url && (
          <a
            href={wish.url}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="inline-flex w-fit items-center gap-1 text-sm font-semibold"
          >
            {t('item.open-link')}
            <span className="max-w-48 truncate font-normal text-muted">{new URL(wish.url).hostname}</span>
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
};
