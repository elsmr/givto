import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldHint, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { tabsListVariants } from '@/components/ui/tabs';
import { holidayOn } from '@/lib/local-date';
import { EditionKind, isPosted } from '@/lib/schema/edition';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, ExternalLink, Gift, Plus, Users, VenetianMask, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ConspiracyAnimation } from './explainers/conspiracy';
import { SecretSantaAnimation } from './explainers/secret-santa';
import { WhiteElephantAnimation } from './explainers/white-elephant';
import type { EditionDetailsDraft } from './use-create-draft';

type FieldsProps = {
  draft: EditionDetailsDraft;
  onChange: (patch: Partial<EditionDetailsDraft>) => void;
};

/** Gift day (28): an optional date; the time only once asked for, or when there is one. */
export const GiftDayFields = ({ draft, today, onChange }: FieldsProps & { today: string }) => {
  const t = useTranslations('create.details.gift-day');
  const tHoliday = useTranslations('ui.holidays');
  const [timeAsked, setTimeAsked] = useState(false);
  const holiday = draft.giftDate ? holidayOn(draft.giftDate) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-3">
        <Field className="min-w-0 flex-1">
          <FieldLabel htmlFor="gift-date" optional>
            {t('legend')}
          </FieldLabel>
          <Input
            id="gift-date"
            type="date"
            min={today}
            value={draft.giftDate}
            aria-describedby={holiday ? 'gift-date-holiday' : undefined}
            onChange={(event) => onChange({ giftDate: event.target.value })}
          />
        </Field>
        {(timeAsked || draft.giftTime) && (
          <Field className="w-32 shrink-0">
            <FieldLabel htmlFor="gift-time">{t('time')}</FieldLabel>
            <Input
              id="gift-time"
              type="time"
              autoFocus={timeAsked && !draft.giftTime}
              disabled={!draft.giftDate}
              value={draft.giftTime}
              onChange={(event) => onChange({ giftTime: event.target.value })}
            />
          </Field>
        )}
        {!timeAsked && !draft.giftTime && draft.giftDate && (
          <Button type="button" variant="ghost" size="sm" className="mb-0.5" onClick={() => setTimeAsked(true)}>
            <Plus aria-hidden="true" />
            {t('time')}
          </Button>
        )}
      </div>
      {holiday && <FieldDescription id="gift-date-holiday">{tHoliday(holiday)}</FieldDescription>}
    </div>
  );
};

const exchangeIcons = { inPerson: Users, online: Video };

/**
 * In person or online. Online is any posted mode: addresses and a video call link. 'both' is no longer offered but
 * kept when already set.
 */
export const ExchangeField = ({ draft, onChange }: FieldsProps) => {
  const t = useTranslations('create.details.exchange');
  const online = isPosted(draft);
  const choose = (next: 'inPerson' | 'online') => onChange({ exchangeMode: next === 'inPerson' ? 'inPerson' : online ? draft.exchangeMode : 'byPost' });

  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label">{t('label')}</FieldLegend>
      <div className={cn(tabsListVariants({ variant: 'segmented' }), 'flex w-full items-stretch')}>
        {(['inPerson', 'online'] as const).map((option) => {
          const Icon = exchangeIcons[option];
          const checked = (option === 'online') === online;
          return (
            <label
              key={option}
              className="relative flex min-h-11 flex-1 basis-0 cursor-pointer items-center justify-center gap-2 border-2 border-transparent px-1 py-1.5 text-sm font-bold not-has-checked:hover:bg-surface has-checked:-translate-x-0.5 has-checked:-translate-y-0.5 has-checked:border-outline has-checked:bg-surface has-checked:shadow-sm has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid"
            >
              <input
                type="radio"
                name="exchange-mode"
                value={option}
                checked={checked}
                onChange={() => choose(option)}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0"
              />
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              {t(option)}
            </label>
          );
        })}
      </div>
      <FieldDescription>{t(online ? 'online-help' : 'inPerson-help')}</FieldDescription>
    </FieldSet>
  );
};

const animations = { secretSanta: SecretSantaAnimation, whiteElephant: WhiteElephantAnimation, conspiracy: ConspiracyAnimation };
const icons = { secretSanta: Gift, whiteElephant: ArrowLeftRight, conspiracy: VenetianMask };

/** Secret Santa, white elephant or Conspiracy Santa (88), each explained behind its (?); the settings show it until names are drawn or it's locked in. */
export const KindField = ({ kind, onChange }: { kind: EditionKind; onChange: (kind: EditionKind) => void }) => {
  const t = useTranslations('create.details.kind');

  return (
    <FieldSet>
      <FieldLegend className="sr-only">{t('label')}</FieldLegend>
      <div className="grid grid-cols-2 gap-3">
        {EditionKind.options.map((option) => {
          const Animation = animations[option];
          const Icon = icons[option];
          // Nearly every group is a Secret Santa: it gets the full-width card.
          const main = option === 'secretSanta';
          return (
            <div
              key={option}
              className={cn(
                'group/kind relative bg-page bordered not-has-checked:border-dashed not-has-checked:border-muted not-has-checked:text-muted not-has-checked:hover:border-solid not-has-checked:hover:border-outline not-has-checked:hover:bg-surface not-has-checked:hover:text-ink has-checked:-translate-x-0.5 has-checked:-translate-y-0.5 has-checked:bg-yellow has-checked:text-outline has-checked:shadow-md has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid',
                main && 'col-span-2',
              )}
            >
              <label className={cn('flex h-full cursor-pointer gap-3 pr-10', main ? 'items-center p-4' : 'flex-col gap-1.5 p-3')}>
                <input
                  type="radio"
                  name="edition-kind"
                  value={option}
                  checked={kind === option}
                  onChange={() => onChange(option)}
                  aria-labelledby={`edition-kind-${option}`}
                  aria-describedby={`edition-kind-${option}-subtitle`}
                  className="absolute inset-0 cursor-pointer appearance-none opacity-0"
                />
                <Icon aria-hidden="true" className={cn('shrink-0', main ? 'size-8' : 'size-5')} />
                <span className="flex flex-col gap-0.5">
                  <span id={`edition-kind-${option}`} className={cn('leading-tight font-bold', main && 'text-lg')}>
                    {t(option)}
                  </span>
                  <span id={`edition-kind-${option}-subtitle`} className="text-sm text-muted group-has-checked/kind:text-outline">
                    {t(`subtitle.${option}`)}
                  </span>
                </span>
              </label>
              <div className="absolute top-0 right-0 group-has-checked/kind:[&>button]:text-outline [&>button]:m-0">
                <FieldHint label={t('about', { name: t(option) })}>
                  <div className="flex flex-col gap-3">
                    <Animation />
                    <p>{t(`explain.${option}`)}</p>
                    <a href={t(`wiki.${option}`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 self-start">
                      {t('wiki.label')}
                      <ExternalLink aria-hidden="true" className="size-3.5" />
                      <span className="sr-only">{t('wiki.new-tab')}</span>
                    </a>
                  </div>
                </FieldHint>
              </div>
            </div>
          );
        })}
      </div>
    </FieldSet>
  );
};
