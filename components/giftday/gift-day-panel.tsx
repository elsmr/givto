import { DisclosureCard } from '@/components/group/disclosure-card';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BigRevealCard } from './big-reveal-card';
import { UnwrapOrderCard } from './unwrap-order-card';
import { useGiftDay } from './use-gift-day';

/**
 * The unwrap order (32), collapsed on the overview (61); while shopping also the big reveal (31),
 * which moves into view from gift day on. Pages must load `giftday` messages.
 */
export const GiftDayPanel = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('giftday.panel');
  const input = { groupSlug: group.slug, editionNumber: edition.number };
  const giftDay = useGiftDay(input, edition.status);

  if (!giftDay.data) return null;
  const { unwrapOrder, unwrapMode, reveal } = giftDay.data;
  const manage = group.me.isOrganizer && edition.isCurrent;
  const { status } = edition;
  const withReveal = status === 'drawn' && (manage || reveal.enabled);
  if (status === 'done' && !unwrapOrder) return null;
  return (
    <DisclosureCard title={withReveal ? t('with-reveal') : t('order')} icon={Shuffle} tone="yellow">
      <UnwrapOrderCard
        {...input}
        order={unwrapOrder}
        mode={unwrapMode}
        meId={group.me.memberId}
        canShuffle={manage && status !== 'done'}
        canPresent={manage && status !== 'giftday'}
      />
      {withReveal && <BigRevealCard {...input} reveal={reveal} status={status} manage={manage} />}
    </DisclosureCard>
  );
};
