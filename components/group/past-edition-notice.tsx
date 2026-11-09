import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** On /g/[slug]/[edition] for an earlier edition, or one that doesn't exist: a way back to the current one. */
export const PastEditionNotice = ({ slug, title }: { slug: string; title?: string }) => {
  const t = useTranslations('group.editions');

  return (
    <Alert>
      <AlertDescription className="flex flex-wrap gap-x-3 gap-y-1">
        <span>{title ? t('past', { edition: title }) : t('not-found')}</span>
        <Link href={`/g/${slug}`} className="font-semibold">
          {t('go-current')}
        </Link>
      </AlertDescription>
    </Alert>
  );
};
