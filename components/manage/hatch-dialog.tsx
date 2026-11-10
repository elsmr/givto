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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { addDays, formatLocalDate, todayIn } from '@/lib/local-date';
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
  const points = hatchPoints[hatch].filter((point) => !(shuffled && point === 'startGiftDay.points.order'));
  const error = run.error && knownAppError(run.error, hatchErrors);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(`${hatch}.title`)}</DialogTitle>
          <DialogDescription>{t(`${hatch}.description`, { today: todayLabel })}</DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {points.map((point) => (
            <li key={point}>{t(point, { today: todayLabel })}</li>
          ))}
        </ul>
        {hatch === 'backToShopping' && (
          <Field>
            <FieldLabel htmlFor="hatch-gift-day">{t('backToShopping.date')}</FieldLabel>
            <Input
              id="hatch-gift-day"
              type="date"
              required
              min={tomorrow}
              value={giftDayDate}
              onChange={(event) => setGiftDayDate(event.target.value)}
            />
            <FieldDescription>{t('backToShopping.date-help')}</FieldDescription>
          </Field>
        )}
        {error && <FieldError>{t(`errors.${error}`)}</FieldError>}
        <DialogFooter>
          <DialogClose render={<Button variant="neutral" />}>{t('cancel')}</DialogClose>
          <Button
            disabled={run.isPending || (hatch === 'backToShopping' && !giftDayDate)}
            onClick={() => run.mutate({ editionNumber: edition.number, giftDayDate })}
          >
            {t(`${hatch}.confirm`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
