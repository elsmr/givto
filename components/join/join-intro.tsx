import type { JoinPreview } from '@/lib/server/join-preview';
import { useTranslations } from 'next-intl';

export const JoinIntro = ({ preview }: { preview: JoinPreview }) => {
  const t = useTranslations('join.intro');

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-4xl font-extrabold sm:text-5xl">
        {t('title', { organizer: preview.organizerFirstName, group: preview.groupName })}
      </h1>
      <p className="text-lg">{t('description')}</p>
      {preview.requiresApproval && <p className="text-muted">{t('approval')}</p>}
    </div>
  );
};
