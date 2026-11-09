import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { PrivacyList } from './privacy-list';
import { PrivacySection } from './privacy-section';

const processors = ['vercel', 'mongodb', 'mailgun', 'sentry'] as const;

export const PrivacyProcessors = () => {
  const t = useTranslations('privacy.processors');
  const bold = (chunks: ReactNode) => <strong>{chunks}</strong>;

  return (
    <PrivacySection id="privacy-processors" title={t('title')}>
      <p>{t('intro')}</p>
      <PrivacyList
        items={processors.map((processor) => t.rich(processor, { b: bold }))}
      />
    </PrivacySection>
  );
};
