import { knownAppError } from '@/components/group/app-error-code';
import type { GroupEdition } from '@/components/group/group-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { addDays, formatLocalDate, todayIn } from '@/lib/local-date';
import { drawsNames, wishesOn } from '@/lib/schema/edition';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { hatchErrors, hatchPoints, type Hatch } from './hatches';
import { useHatch } from './use-hatch';

type HatchDialogProps = {
  hatch: Hatch;
  groupSlug: string;
  edition: GroupEdition;
  /** The unwrap order is shuffled already (start now only shuffles when it isn't). */
  shuffled: boolean;
  onClose: () => void;
};

/** "Are you sure?" for one hatch (64): what will happen, point by point; back to shopping asks for the new date. */
export const HatchDialog = ({ hatch, groupSlug, edition, shuffled, onClose }: HatchDialogProps) => {
  const t = useTranslations('manage');
  const locale = useLocale();
  const today = todayIn(edition.timeZone);
  const tomorrow = addDays(today, 1);
  const upcoming = edition.giftDay && edition.giftDay.date > today ? edition.giftDay.date : '';
  const [giftDayDate, setGiftDayDate] = useState(upcoming || tomorrow);
  const run = useHatch(hatch, groupSlug, onClose);
  const todayLabel = formatLocalDate(today, locale);
  // Who was whose Santa (31, 62) as the reveal and guessing switches have it; there's none without a draw (88).
  const santas = edition.reveal ? 'revealed' : edition.guessing ? 'turns' : 'secret';
  // Nothing to tick off without wishes either.
  const skipPoint = (point: string) =>
    (point.endsWith('.points.secret') && point !== 'backToShopping.points.secret' && !drawsNames(edition)) ||
    (point === 'finishGiftDay.points.received' && !wishesOn(edition));
  const points = hatchPoints[hatch].filter(
    (point) => !(shuffled && point === 'startGiftDay.points.order') && !skipPoint(point)
  );
  // A White Elephant needs as many players as locking in did, also when people left since.
  const tooFew = hatch === 'startGiftDay' && edition.kind === 'whiteElephant' && edition.participantIds.length < MIN_PARTICIPANTS;
  const error = tooFew ? 'TOO_FEW_PEOPLE' : run.error && knownAppError(run.error, hatchErrors);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(`${hatch}.title`)}</DialogTitle>
          <DialogDescription>{t(`${hatch}.description`, { today: todayLabel })}</DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {points.map((point) => (
            <li key={point}>{t(point, { today: todayLabel, santas, kind: edition.kind })}</li>
          ))}
        </ul>
        {hatch === 'backToShopping' && (
          <Field>
            <FieldLabel htmlFor="hatch-gift-day" hint={t('backToShopping.date-help')}>{t('backToShopping.date')}</FieldLabel>
            <Input
              id="hatch-gift-day"
              type="date"
              required
              min={tomorrow}
              value={giftDayDate}
              onChange={(event) => setGiftDayDate(event.target.value)}
            />
          </Field>
        )}
        {error && <FieldError>{t(`errors.${error}`, { min: MIN_PARTICIPANTS })}</FieldError>}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('cancel')}</DialogClose>
          <Button
            disabled={run.isPending || tooFew || (hatch === 'backToShopping' && !giftDayDate)}
            onClick={() => run.mutate({ editionNumber: edition.number, giftDayDate })}
          >
            {t(`${hatch}.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
