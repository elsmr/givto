import { retention } from '@/lib/privacy';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PrivacyList } from './privacy-list';
import { PrivacySection } from './privacy-section';

export const PrivacyRetention = () => {
  const t = useTranslations('privacy.retention');

  return (
    <PrivacySection icon={Clock} tone="yellow" title={t('title')}>
      <PrivacyList
        items={[
          t('sign-in', { minutes: retention.signInCodeMinutes }),
          t('sessions', { days: retention.sessionDays }),
          t('edition-messages', { months: retention.editionMessagesMonths }),
          t('draw', { months: retention.drawMaxMonths }),
          t('groups', { months: retention.inactiveGroupMonths }),
          t('account'),
          t('errors', { days: retention.errorReportDays }),
          t('emails', { days: retention.sentEmailsDays }),
          t('logs'),
        ]}
      />
    </PrivacySection>
  );
};
