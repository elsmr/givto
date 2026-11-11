import { DisclosureCard } from '@/components/ui/disclosure-card';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { GuessingNote } from '@/components/guess/guessing-note';
import { UnwrapOrderCard } from './unwrap-order-card';
import { useGiftDay } from './use-gift-day';

/** The unwrap order (32), collapsed on the overview (61). Pages must load `giftday` messages. */
export const GiftDayPanel = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('giftday.panel');
  const input = { groupSlug: group.slug, editionNumber: edition.number };
  const giftDay = useGiftDay(input, edition.status);

  if (!giftDay.data) return null;
  const { unwrapOrder, unwrapMode, guessing } = giftDay.data;
  const manage = group.me.isOrganizer && edition.isCurrent;
  const { status } = edition;
  if (status === 'done' && !unwrapOrder) return null;
  return (
    <DisclosureCard title={t('order')} icon={Shuffle} tone="yellow">
      <UnwrapOrderCard
        {...input}
        order={unwrapOrder}
        mode={unwrapMode}
        meId={group.me.memberId}
        canShuffle={manage && status !== 'done'}
        canPresent={manage && status !== 'giftday'}
        showMode={edition.kind !== 'whiteElephant'}
      />
      {manage && guessing && status !== 'done' && <GuessingNote groupSlug={group.slug} />}
    </DisclosureCard>
  );
};
