import { NewEditionDialog } from '@/components/manage/new-edition-dialog';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { todayIn } from '@/lib/local-date';
import { Repeat } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { GroupData, GroupEdition } from '../group/group-data';

/**
 * Organizer, once gift day has passed: "Same again next year?" (33) → the new edition dialog (77).
 * Not before gift day: there it's in the Manage menu, so a new edition doesn't push this one's
 * giftees off the group home by accident.
 */
export const NextEditionCard = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('draw.next');
  const [open, setOpen] = useState(false);
  const upcoming = edition.status !== 'done' && edition.giftDay && edition.giftDay.date >= todayIn(edition.timeZone);

  if (upcoming) return null;
  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Repeat} tone="primary-muted">
          {t('title')}
        </IconCardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="neutral" onClick={() => setOpen(true)}>
          {t('start')}
        </Button>
      </CardContent>
      {open && <NewEditionDialog group={group} edition={edition} onClose={() => setOpen(false)} />}
    </Card>
  );
};
