import { Mail, Scale } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { OwnerContact } from '@/pages/privacy';
import { PrivacySection } from './privacy-section';

export const PrivacyRights = ({ owner }: { owner: OwnerContact }) => {
  const t = useTranslations('privacy');

  return (
    <>
      <PrivacySection icon={Scale} tone="coral" title={t('rights.title')}>
        <p>
          {t.rich('rights.account', {
            link: (chunks) => <Link href="/account">{chunks}</Link>,
          })}
        </p>
        <p>{t('rights.other')}</p>
      </PrivacySection>
      <PrivacySection icon={Mail} tone="primary-muted" title={t('contact.title')}>
        <p>
          {t.rich('contact.text', {
            controller: owner.name,
            email: owner.email,
            link: (chunks) => <a href={`mailto:${owner.email}`}>{chunks}</a>,
          })}
        </p>
      </PrivacySection>
    </>
  );
};
