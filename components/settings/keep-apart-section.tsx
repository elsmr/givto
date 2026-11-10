import { appErrorCode } from '@/components/group/app-error-code';
import { isBeforeDraw } from '@/components/group/edition-phase';
import { FeasibilityNote } from '@/components/group/feasibility-note';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { HouseholdsEditor } from '@/components/group/households-editor';
import { KeepApartPairsEditor } from '@/components/group/keep-apart-pairs-editor';
import { useInvalidateGroup } from '@/components/group/use-invalidate-group';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { toast } from '@/components/ui/toast';
import { toExclusions, type KeepApartPair } from '@/lib/exclusions';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { Split } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Organizer = NonNullable<GroupData['organizer']>;
type KeepApartSectionProps = { group: GroupData; edition: GroupEdition | null; organizer: Organizer };

/** Households and keep-apart pairs with a live feasibility check (26). Editable before the draw only. */
export const KeepApartSection = ({ group, edition, organizer }: KeepApartSectionProps) => {
  const t = useTranslations('group.keep-apart');
  const tSettings = useTranslations('settings');
  const trpc = useTRPC();
  const invalidate = useInvalidateGroup(group.slug);
  const [households, setHouseholds] = useState(organizer.households);
  const [pairs, setPairs] = useState<KeepApartPair[]>(organizer.keepApartPairs);
  const save = useMutation(
    trpc.group.setKeepApart.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('saved'), type: 'success' });
        void invalidate();
      },
    })
  );
  const joined = group.members.filter((m) => m.status === 'joined');
  const complete = households.filter((h) => h.length >= 2);
  const errorCode = save.error && appErrorCode(save.error);
  const beforeDraw = Boolean(edition && isBeforeDraw(edition));

  return (
    <Card>
      <CardHeader>
        <IconCardTitle icon={Split} tone="yellow">
          {t('title')}
        </IconCardTitle>
        <CardDescription>{beforeDraw ? t('description') : tSettings('keep-apart-drawn')}</CardDescription>
      </CardHeader>
      {edition && beforeDraw && (
        <CardContent className="flex flex-col gap-6">
          <section aria-labelledby="households-title" className="flex flex-col gap-3">
            <h3 id="households-title" className="text-lg font-bold">{t('households.title')}</h3>
            <HouseholdsEditor households={households} members={joined} onChange={setHouseholds} />
          </section>
          <section aria-labelledby="pairs-title" className="flex flex-col gap-3">
            <h3 id="pairs-title" className="text-lg font-bold">{t('pairs.title')}</h3>
            <KeepApartPairsEditor pairs={pairs} members={joined} onChange={setPairs} />
          </section>
          <FeasibilityNote participantIds={edition.participantIds} exclusions={toExclusions(complete, pairs)} members={joined} />
          {errorCode && <FieldError>{t(`errors.${errorCode === 'DRAW_IMPOSSIBLE' ? 'DRAW_IMPOSSIBLE' : 'INTERNAL'}`)}</FieldError>}
          <Button variant="neutral" className="self-start" disabled={save.isPending} onClick={() => save.mutate({ groupSlug: group.slug, households: complete, pairs })}>
            {t('save')}
          </Button>
        </CardContent>
      )}
    </Card>
  );
};
