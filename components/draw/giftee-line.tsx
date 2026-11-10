import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useGifteeRevealed } from './use-giftee-revealed';

/** One line about my giftee (gift day, 61), hidden until tapped like the reveal card. One button for show and hide keeps focus. */
export const GifteeLine = ({ groupSlug, editionNumber }: { groupSlug: string; editionNumber: number }) => {
  const t = useTranslations('draw.reveal');
  const trpc = useTRPC();
  const mine = useQuery(trpc.draw.mine.queryOptions({ groupSlug, editionNumber }));
  const [shown, setShown] = useGifteeRevealed(groupSlug, editionNumber);
  const giftee = mine.data?.giftee;

  if (!giftee) return null;
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      <span>{t('buying-for')}</span>
      <strong aria-live="polite" className="font-heading text-xl break-words">
        {shown ? giftee.name : <span aria-hidden="true">•••</span>}
      </strong>
      <Button size="sm" variant="neutral" onClick={() => setShown(!shown)}>
        {shown ? t('hide') : t('show')}
      </Button>
    </p>
  );
};
