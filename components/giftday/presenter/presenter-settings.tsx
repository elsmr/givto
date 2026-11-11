import type { GroupEdition } from '@/components/group/group-data';
import { GuessSetting } from '@/components/guess/guess-settings';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SettingsGroup, SettingsRow } from '@/components/ui/settings-group';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { UnwrapMode } from '@/lib/schema/edition';
import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { RevealSetting } from '../reveal-settings';
import { UnwrapModeSetting } from '../unwrap-mode-setting';

type PresenterSettingsProps = {
  groupSlug: string;
  edition: GroupEdition;
  mode: UnwrapMode;
  inProgress: boolean;
  skipSpin: boolean;
  onSkipSpinChange: (skip: boolean) => void;
};

/** The gear in the presenter's header: this screen's skip-the-spin, and the edition's gift day settings. */
export const PresenterSettings = ({ groupSlug, edition, mode, inProgress, skipSpin, onSkipSpinChange }: PresenterSettingsProps) => {
  const t = useTranslations('giftday.present');
  const id = useId();

  return (
    <Dialog>
      <Tooltip>
        <DialogTrigger render={<TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={t('settings')} />} />}>
          <Settings aria-hidden="true" />
        </DialogTrigger>
        <TooltipContent side="bottom">{t('settings')}</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('settings')}</DialogTitle>
        </DialogHeader>
        <SettingsGroup variant="plain" title={t('settings-turns')}>
          <SettingsRow label={t('skip-spin')} htmlFor={id}>
            <Switch id={id} checked={skipSpin} onCheckedChange={onSkipSpinChange} />
          </SettingsRow>
          <UnwrapModeSetting groupSlug={groupSlug} editionNumber={edition.number} mode={mode} inProgress={inProgress} />
        </SettingsGroup>
        <SettingsGroup variant="plain" title={t('settings-santas')}>
          <GuessSetting groupSlug={groupSlug} edition={edition} />
          <RevealSetting groupSlug={groupSlug} edition={edition} />
        </SettingsGroup>
      </DialogContent>
    </Dialog>
  );
};
