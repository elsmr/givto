import { SettingsGroup, SettingsRow } from '@/components/ui/settings-group';
import type { RouterOutputs } from '@/lib/client/trpc';
import { Download, KeyRound, Mailbox, SlidersHorizontal, TriangleAlert, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AvatarColorSelect } from './avatar-color-select';
import { AddressBook } from './address-book';
import { DeleteAccountDialog } from './delete-account-dialog';
import { ExportButton } from './export-button';
import { LanguageSelect } from './language-select';
import { NameForm } from './name-form';
import { NotificationSettings } from './notification-settings';
import { PasskeyList } from './passkey-list';
import { SignOutEverywhere } from './sign-out-everywhere';
import { ThemeSelect } from './theme-select';

/** Profile, postal addresses, sign-in, preferences, then data; deleting the account last, in a collapsed danger zone. */
export const AccountSettings = ({ me }: { me: RouterOutputs['account']['get'] }) => {
  const t = useTranslations('account');

  return (
    <div className="flex flex-col gap-8">
      <SettingsGroup title={t('profile.title')} icon={UserRound} description={t('profile.description')}>
        <NameForm name={me.name} email={me.email} />
        <AvatarColorSelect name={me.name} color={me.avatarColor} />
      </SettingsGroup>
      <SettingsGroup title={t('address.title')} icon={Mailbox} tone="coral" description={t('address.description')}>
        <AddressBook />
      </SettingsGroup>
      <SettingsGroup title={t('security.title')} icon={KeyRound} tone="mint">
        <SettingsRow label={t('passkeys.title')} description={t('passkeys.description')} below={<PasskeyList email={me.email} />} />
        <SettingsRow label={t('sessions.title')} description={t('sessions.description')}>
          <SignOutEverywhere />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup title={t('preferences.title')} icon={SlidersHorizontal} tone="yellow">
        <LanguageSelect />
        <ThemeSelect />
        <SettingsRow label={t('notifications.title')} below={<NotificationSettings prefs={me.notifications} />} />
      </SettingsGroup>
      <SettingsGroup title={t('export.title')} icon={Download}>
        <SettingsRow label={t('export.description')}>
          <ExportButton />
        </SettingsRow>
      </SettingsGroup>
      <SettingsGroup id="delete" title={t('delete.title')} icon={TriangleAlert} tone="yellow" collapsible danger>
        <SettingsRow label={t('delete.description')}>
          <DeleteAccountDialog email={me.email} />
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
};
