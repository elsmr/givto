import { Button } from '@/components/ui/button';
import { withTooltip } from '@/components/ui/tooltip';
import type { WishLink } from '@/lib/schema/wish';
import { ImageOff, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatBudget } from '@/lib/format-budget';
import { shopName } from './shop-name';
import { WishImage } from './wish-image';

interface WishFormLinksProps {
  links: WishLink[];
  onChange: (links: WishLink[]) => void;
}

/** The wish's links in the form, with their pictures: drop a picture or a whole link. */
export const WishFormLinks = ({ links, onChange }: WishFormLinksProps) => {
  const t = useTranslations('wishlist.form');
  const locale = useLocale();
  if (links.length === 0) return null;
  const replace = (index: number, link?: WishLink) =>
    onChange(links.flatMap((current, i) => (i !== index ? [current] : link ? [link] : [])));

  return (
    <ul className="flex flex-col gap-2">
      {links.map((link, index) => {
        const shop = shopName(link.url);
        return (
          <li key={`${index}-${link.url}`} className="flex items-center gap-3 border-2 border-outline bg-page p-2">
            {link.imageId && (
              <WishImage imageId={link.imageId} alt={t('image-alt', { title: link.title ?? shop })} size={64} className="size-14" />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="mono truncate text-xs font-semibold">{shop}</span>
              <span className="line-clamp-2 text-sm break-words">{link.title ?? link.url}</span>
              {link.price && <span className="mono text-sm text-muted">{formatBudget(link.price, locale)}</span>}
            </div>
            {link.imageId &&
              withTooltip(
                t('remove-image', { shop }),
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => replace(index, { ...link, imageId: undefined })}>
                  <ImageOff aria-hidden="true" />
                </Button>
              )}
            {withTooltip(
              t('remove-link', { shop }),
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => replace(index)}>
                <X aria-hidden="true" />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
};
