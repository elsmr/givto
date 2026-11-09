import { BeforeDrawCard } from '../draw/before-draw-card';
import { DraftCard } from '../draw/draft-card';
import { RevealCard } from '../draw/reveal-card';
import type { GroupData, GroupEdition } from './group-data';

/** The draw on the group home: draft → who's in and "Draw names" → my giftee, tap to reveal. */
export const DrawSlot = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  if (edition.status === 'draft') return <DraftCard group={group} edition={edition} />;
  if (edition.status === 'open') return <BeforeDrawCard group={group} edition={edition} />;
  return <RevealCard groupSlug={group.slug} editionNumber={edition.number} timeZone={edition.timeZone} />;
};
