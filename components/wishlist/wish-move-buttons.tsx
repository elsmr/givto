import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WishView } from './wish-draft';

interface WishMoveButtonsProps {
  wish: WishView;
  index: number;
  count: number;
  onMove: (toIndex: number) => void;
}

const buttonId = (wishId: string, direction: 'up' | 'down') => `move-${direction}-${wishId}`;

/** Keyboard reorder. Focus follows the wish to its new place (or the other button at the ends). */
export const WishMoveButtons = ({ wish, index, count, onMove }: WishMoveButtonsProps) => {
  const t = useTranslations('wishlist.item');

  const move = (direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? index - 1 : index + 1;
    onMove(toIndex);
    const atEnd = direction === 'up' ? toIndex === 0 : toIndex === count - 1;
    const focusId = buttonId(wish.id, atEnd ? (direction === 'up' ? 'down' : 'up') : direction);
    requestAnimationFrame(() => document.getElementById(focusId)?.focus());
  };

  return (
    <>
      <Button
        id={buttonId(wish.id, 'up')}
        variant="ghost"
        size="icon-sm"
        className="col-start-1 row-start-1"
        aria-label={t('move-up', { title: wish.title })}
        disabled={index === 0}
        onClick={() => move('up')}
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        id={buttonId(wish.id, 'down')}
        variant="ghost"
        size="icon-sm"
        className="col-start-1 row-start-2"
        aria-label={t('move-down', { title: wish.title })}
        disabled={index === count - 1}
        onClick={() => move('down')}
      >
        <ArrowDown aria-hidden="true" />
      </Button>
    </>
  );
};
