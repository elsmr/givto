import { Button } from '@/components/ui/button';
import type { WishLink } from '@/lib/schema/wish';
import { ImageOff, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { formatPrice } from './format-price';
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
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{t('links', { count: links.length })}</p>
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
                {link.price && <span className="mono text-sm text-muted">{formatPrice(link.price, locale)}</span>}
              </div>
              {link.imageId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('remove-image', { shop })}
                  onClick={() => replace(index, { ...link, imageId: undefined })}
                >
                  <ImageOff aria-hidden="true" />
                </Button>
              )}
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t('remove-link', { shop })} onClick={() => replace(index)}>
                <X aria-hidden="true" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
