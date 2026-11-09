import type { RouterOutputs } from '@/lib/client/trpc';
import { useTranslations } from 'next-intl';
import { AccountSection } from './account-section';
import { DeleteAccountDialog } from './delete-account-dialog';
import { ExportButton } from './export-button';
import { LanguageSelect } from './language-select';
import { NameForm } from './name-form';
import { NotificationSettings } from './notification-settings';
import { PasskeyList } from './passkey-list';
import { SignOutEverywhere } from './sign-out-everywhere';
import { ThemeSelect } from './theme-select';

export const AccountSettings = ({ me }: { me: RouterOutputs['me']['get'] }) => {
  const t = useTranslations('account');

  return (
    <div className="flex flex-col gap-8">
      <AccountSection id="profile" title={t('profile.title')} description={t('profile.description')}>
        <NameForm name={me.name} email={me.email} />
      </AccountSection>
      <div className="grid gap-8 md:grid-cols-2">
        <AccountSection id="language" title={t('language.title')} description={t('language.description')}>
          <LanguageSelect />
        </AccountSection>
        <AccountSection id="appearance" title={t('theme.title')} description={t('theme.description')}>
          <ThemeSelect />
        </AccountSection>
      </div>
      <AccountSection id="passkeys" title={t('passkeys.title')} description={t('passkeys.description')}>
        <PasskeyList email={me.email} />
      </AccountSection>
      <AccountSection id="notifications" title={t('notifications.title')} description={t('notifications.description')}>
        <NotificationSettings prefs={me.notifications} />
      </AccountSection>
      <AccountSection id="sessions" title={t('sessions.title')} description={t('sessions.description')}>
        <SignOutEverywhere />
      </AccountSection>
      <AccountSection id="data" title={t('export.title')} description={t('export.description')}>
        <ExportButton />
      </AccountSection>
      <AccountSection id="delete" title={t('delete.title')} description={t('delete.description')}>
        <DeleteAccountDialog email={me.email} />
      </AccountSection>
    </div>
  );
};
