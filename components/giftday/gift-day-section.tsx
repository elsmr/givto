import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import type { GroupData, GroupEdition } from '../group/group-data';
import { BigRevealCard } from './big-reveal-card';
import { GiftDayHero } from './gift-day-hero';
import { HowDidItGoCard } from './how-did-it-go-card';
import { UnwrapOrderCard } from './unwrap-order-card';

const afterDraw = new Set(['drawn', 'giftday', 'done']);

/**
 * Gift day on the group home (31): from the draw on, the unwrap order (32) and the big reveal;
 * on the day "It's gift day!"; after it "How did it go?". Pages must load `giftday` messages.
 */
export const GiftDaySection = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const trpc = useTRPC();
  const shown = afterDraw.has(edition.status);
  const input = { groupSlug: group.slug, editionNumber: edition.number };
  const giftDay = useQuery({ ...trpc.giftday.get.queryOptions(input), enabled: shown });

  if (!shown || !giftDay.data) return null;
  const { unwrapOrder, reveal } = giftDay.data;
  const manage = group.me.isOrganizer && edition.isCurrent;
  const { status } = edition;
  return (
    <>
      {status === 'giftday' && <GiftDayHero groupSlug={group.slug} canPresent={manage} />}
      {status === 'done' && edition.isCurrent && <HowDidItGoCard groupSlug={group.slug} />}
      {(status !== 'done' || unwrapOrder) && (
        <UnwrapOrderCard
          {...input}
          order={unwrapOrder}
          meId={group.me.memberId}
          canShuffle={manage && status !== 'done'}
          canPresent={manage && status !== 'giftday'}
        />
      )}
      <BigRevealCard {...input} reveal={reveal} status={status} manage={manage} />
    </>
  );
};
