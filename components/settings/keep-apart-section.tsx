import { appErrorCode } from '@/components/group/app-error-code';
import { FeasibilityNote } from '@/components/group/feasibility-note';
import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { KeepApartRowsEditor } from '@/components/group/keep-apart-rows-editor';
import { useInvalidateGroup } from '@/components/group/use-invalidate-group';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { FieldError } from '@/components/ui/field';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { toast } from '@/components/ui/toast';
import { toExclusions } from '@/lib/exclusions';
import { isBeforeDraw } from '@/lib/schema/edition';
import { useTRPC } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { Split } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Organizer = NonNullable<GroupData['organizer']>;
type KeepApartSectionProps = { group: GroupData; edition: GroupEdition | null; organizer: Organizer };

/** Who shouldn't draw each other, with a live feasibility check (26). Editable before the draw only. */
export const KeepApartSection = ({ group, edition, organizer }: KeepApartSectionProps) => {
  const t = useTranslations('group.keep-apart');
  const tSettings = useTranslations('settings');
  const trpc = useTRPC();
  const invalidate = useInvalidateGroup(group.slug);
  const [rows, setRows] = useState(organizer.households);
  const save = useMutation(
    trpc.group.setKeepApart.mutationOptions({
      onSuccess: () => {
        toast.add({ title: t('saved'), type: 'success' });
        void invalidate();
      },
    })
  );
  const joined = group.members.filter((m) => m.status === 'joined');
  const complete = rows.filter((row) => row.length >= 2);
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
          <KeepApartRowsEditor rows={rows} members={joined} onChange={setRows} />
          <div className="flex flex-col gap-3">
            <FeasibilityNote participantIds={edition.participantIds} exclusions={toExclusions(complete)} members={joined} />
            {errorCode && <FieldError>{t(`errors.${errorCode === 'DRAW_IMPOSSIBLE' ? 'DRAW_IMPOSSIBLE' : 'INTERNAL'}`)}</FieldError>}
            <Button variant="neutral" className="self-start" disabled={save.isPending} onClick={() => save.mutate({ groupSlug: group.slug, households: complete })}>
              {t('save')}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
