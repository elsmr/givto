import { DraftCard } from '@/components/draw/draft-card';
import { GetEveryoneInCard } from '@/components/draw/get-everyone-in-card';
import { RevealCard } from '@/components/draw/reveal-card';
import { AfterGiftDayMain } from '@/components/giftday/after-gift-day-main';
import { GiftDayMain } from '@/components/giftday/gift-day-main';
import { Confetti } from '@/components/giftday/presenter/confetti';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';
import type { GroupData, GroupEdition } from './group-data';
import { useDrawnNow } from './use-drawn-now';
import type { GroupTab } from './use-group-tab';

type PhaseMainCardProps = { group: GroupData; edition: GroupEdition; manage: boolean; showTab: (tab: GroupTab) => void };

/** The one thing that matters in this phase, first on the overview (61). */
export const PhaseMainCard = ({ group, edition, manage, showTab }: PhaseMainCardProps) => {
  const t = useTranslations('group.overview');
  const { slug } = group;
  const drawnNow = useDrawnNow(edition.status);

  switch (edition.status) {
    case 'draft':
      return <DraftCard group={group} edition={edition} />;
    case 'open':
      return <GetEveryoneInCard group={group} edition={edition} />;
    case 'drawn':
      // Names drawn just now: confetti, and the card pops in where the draw card was.
      return (
        <m.div initial={drawnNow ? { opacity: 0, scale: 0.92 } : false} animate={{ opacity: 1, scale: 1 }}>
          {drawnNow && <Confetti />}
          <RevealCard groupSlug={slug} editionNumber={edition.number} timeZone={edition.timeZone}>
            <Button onClick={() => showTab('giftee')}>
              {t('to-giftee')}
              <ArrowRight aria-hidden="true" />
            </Button>
          </RevealCard>
        </m.div>
      );
    case 'giftday':
      return <GiftDayMain groupSlug={slug} edition={edition} manage={manage} />;
    case 'done':
      return <AfterGiftDayMain groupSlug={slug} edition={edition} manage={manage} />;
  }
};
