import { DraftCard } from '@/components/draw/draft-card';
import { GetEveryoneInCard } from '@/components/draw/get-everyone-in-card';
import { RevealCard } from '@/components/draw/reveal-card';
import { AfterGiftDayMain } from '@/components/giftday/after-gift-day-main';
import { GiftDayMain } from '@/components/giftday/gift-day-main';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupData, GroupEdition } from './group-data';
import type { GroupTab } from './use-group-tab';

type PhaseMainCardProps = { group: GroupData; edition: GroupEdition; manage: boolean; showTab: (tab: GroupTab) => void };

/** The one thing that matters in this phase, first on the overview (61). */
export const PhaseMainCard = ({ group, edition, manage, showTab }: PhaseMainCardProps) => {
  const t = useTranslations('group.overview');
  const { slug } = group;

  switch (edition.status) {
    case 'draft':
      return <DraftCard group={group} edition={edition} />;
    case 'open':
      return <GetEveryoneInCard group={group} edition={edition} />;
    case 'drawn':
      return (
        <RevealCard groupSlug={slug} editionNumber={edition.number} timeZone={edition.timeZone}>
          <Button onClick={() => showTab('giftee')}>
            {t('to-giftee')}
            <ArrowRight aria-hidden="true" />
          </Button>
        </RevealCard>
      );
    case 'giftday':
      return <GiftDayMain groupSlug={slug} edition={edition} manage={manage} />;
    case 'done':
      return <AfterGiftDayMain groupSlug={slug} edition={edition} manage={manage} />;
  }
};
