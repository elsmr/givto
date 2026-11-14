import { CardDivider } from '@/components/ui/card';
import type { RouterOutputs } from '@/lib/client/trpc';
import { Download, KeyRound, Mailbox, SlidersHorizontal, TriangleAlert, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AccountSection, AccountSubsection } from './account-section';
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

/** Profile, postal addresses, sign-in, preferences, then data; deleting the account last, on its own coral card. */
export const AccountSettings = ({ me }: { me: RouterOutputs['account']['get'] }) => {
  const t = useTranslations('account');

  return (
    <div className="flex flex-col gap-8">
      <AccountSection title={t('profile.title')} icon={UserRound} tone="primary-muted" description={t('profile.description')}>
        <AccountSubsection className="gap-6">
          <NameForm name={me.name} email={me.email} />
          <AvatarColorSelect name={me.name} color={me.avatarColor} />
        </AccountSubsection>
      </AccountSection>
      <AccountSection title={t('address.title')} icon={Mailbox} tone="coral" description={t('address.description')}>
        <AccountSubsection>
          <AddressBook />
        </AccountSubsection>
      </AccountSection>
      <AccountSection title={t('security.title')} icon={KeyRound} tone="mint">
        <AccountSubsection title={t('passkeys.title')} description={t('passkeys.description')}>
          <PasskeyList email={me.email} />
        </AccountSubsection>
        <CardDivider />
        <AccountSubsection title={t('sessions.title')} description={t('sessions.description')}>
          <SignOutEverywhere />
        </AccountSubsection>
      </AccountSection>
      <AccountSection title={t('preferences.title')} icon={SlidersHorizontal} tone="yellow">
        <AccountSubsection className="gap-6">
          <LanguageSelect />
          <ThemeSelect />
        </AccountSubsection>
        <CardDivider />
        <AccountSubsection title={t('notifications.title')}>
          <NotificationSettings prefs={me.notifications} />
        </AccountSubsection>
      </AccountSection>
      <AccountSection title={t('export.title')} icon={Download} tone="primary-muted" description={t('export.description')}>
        <AccountSubsection>
          <ExportButton />
        </AccountSubsection>
      </AccountSection>
      <AccountSection title={t('delete.title')} icon={TriangleAlert} tone="yellow" description={t('delete.description')} danger>
        <AccountSubsection>
          <DeleteAccountDialog email={me.email} />
        </AccountSubsection>
      </AccountSection>
    </div>
  );
};
