import { Card, CardContent, CardDivider } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { formatBudget } from '@/lib/format-budget';
import { WishBadges } from './wish-badges';
import { Badge } from '@/components/ui/badge';
import { WishBuyLinks } from './wish-buy-links';
import type { WishView } from './wish-draft';
import { WishImage } from './wish-image';
import { LinkedText } from './linked-text';

/** Notes and links: under picture and title when narrow, beside the picture when wide. */
const wide = 'col-span-2 @md/wish:col-span-1 @md/wish:col-start-2';

interface WishCardProps {
  wish: WishView;
  inBudget?: boolean;
  /** The wish's place in the owner's order. */
  position?: number;
  /** Status next to the badges, e.g. "Hidden here". */
  status?: ReactNode;
  /** Actions under the wish: Dibs!, reorder, edit. */
  children?: ReactNode;
  className?: string;
}

/**
 * One wish, read-only, the same for the owner and for Santas (73): the first link's picture,
 * title, badges, price, notes and a shop chip per link. Everything renders as text (03 XSS).
 */
export const WishCard = ({ wish, inBudget, position, status, children, className }: WishCardProps) => {
  const t = useTranslations('wishlist');
  const locale = useLocale();
  const picture = wish.links.find((link) => link.imageId);

  return (
    <Card size="sm" className={cn('@container/wish', className)}>
      {/* Narrow: picture beside the title, notes and links below at full width. Wide: the picture beside everything. */}
      <CardContent
        className={cn(
          'gap-x-3 gap-y-2 @md/wish:gap-x-4',
          picture ? 'grid grid-cols-[auto_minmax(0,1fr)] items-start' : 'flex flex-col'
        )}
      >
        {picture?.imageId && (
          <WishImage
            imageId={picture.imageId}
            alt={t('form.image-alt', { title: picture.title ?? wish.title })}
            size={128}
            className="size-20 @md/wish:row-span-3 @md/wish:size-32"
          />
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-start gap-2">
            {position !== undefined && (
              <span aria-hidden="true" className="mono bg-yellow px-1.5 text-sm leading-6 font-bold text-ink tabular-nums">
                {position}
              </span>
            )}
            <h3 className="font-sans text-lg leading-snug font-bold break-words">{wish.title}</h3>
          </div>
          <WishBadges wish={wish} status={status} />
          {(wish.price || wish.variant) && (
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {wish.price && <span className="mono">{formatBudget(wish.price, locale)}</span>}
              {wish.price && wish.variant && <span aria-hidden="true">·</span>}
              {wish.variant}
              {inBudget && <Badge variant="mint">{t('item.in-budget')}</Badge>}
            </p>
          )}
        </div>
        {wish.description && (
          <p className={cn('text-sm break-words whitespace-pre-line', wide)}>
            <LinkedText text={wish.description} />
          </p>
        )}
        {wish.links.length > 0 && (
          <div className={wide}>
            <WishBuyLinks links={wish.links} />
          </div>
        )}
      </CardContent>
      {children && (
        <>
          <CardDivider />
          <CardContent>{children}</CardContent>
        </>
      )}
    </Card>
  );
};
