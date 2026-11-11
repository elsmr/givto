import { buttonVariants } from '@/components/ui/button';
import type { WishLink } from '@/lib/schema/wish';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ExternalLink } from 'lucide-react';
import type { ReactElement } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatPrice } from './format-price';
import { shopName } from './shop-name';

/** The page's title, imported with the link, as a tooltip on its chip. */
const withLinkTitle = (title: string | undefined, link: ReactElement) =>
  title ? (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  ) : (
    link
  );

/** "bol.com · € 33,75" per link (73). Links are http(s) only (schema) and tell shops nothing about us. */
export const WishBuyLinks = ({ links }: { links: WishLink[] }) => {
  const t = useTranslations('wishlist.item');
  const locale = useLocale();

  return (
    <ul className="flex flex-wrap gap-2" aria-label={t('links')}>
      {links.map((link, index) => (
        <li key={`${index}-${link.url}`} className="min-w-0 max-w-full">
          {withLinkTitle(
            link.title,
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className={buttonVariants({ variant: 'neutral', size: 'sm', className: 'max-w-full shadow-sm' })}
            >
              <span className="min-w-0 truncate">{shopName(link.url)}</span>
              {link.price && <span className="mono font-normal">{formatPrice(link.price, locale)}</span>}
              <ExternalLink aria-hidden="true" />
              <span className="sr-only">{t('new-tab')}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
};
