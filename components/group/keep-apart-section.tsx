import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import { toast } from '@/components/ui/toast';
import { toExclusions, type KeepApartPair } from '@/lib/exclusions';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { appErrorCode } from './app-error-code';
import { FeasibilityNote } from './feasibility-note';
import type { GroupData, GroupEdition } from './group-data';
import { HouseholdsEditor } from './households-editor';
import { KeepApartPairsEditor } from './keep-apart-pairs-editor';
import { useInvalidateGroup } from './use-invalidate-group';

type Organizer = NonNullable<GroupData['organizer']>;
type KeepApartSectionProps = { group: GroupData; edition: GroupEdition; organizer: Organizer };

/** Households and keep-apart pairs with a live feasibility check (26). Organizer, before the draw. */
export const KeepApartSection = ({ group, edition, organizer }: KeepApartSectionProps) => {
  const t = useTranslations('group.keep-apart');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
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
    </Card>
  );
};
