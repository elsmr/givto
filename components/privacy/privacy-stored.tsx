import { Database } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { PrivacyList } from './privacy-list';
import { PrivacySection } from './privacy-section';

const kinds = [
  'account',
  'sign-in',
  'groups',
  'wishes',
  'addresses',
  'emails',
  'cookies',
] as const;

export const PrivacyStored = () => {
  const t = useTranslations('privacy');
  const bold = (chunks: ReactNode) => <strong>{chunks}</strong>;

  return (
    <PrivacySection icon={Database} tone="primary-muted" title={t('stored.title')}>
      <PrivacyList items={kinds.map((kind) => t.rich(`stored.${kind}`, { b: bold }))} />
      <p>{t('basis')}</p>
    </PrivacySection>
  );
};
