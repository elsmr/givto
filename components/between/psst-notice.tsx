import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import type { NudgeKind } from '@/lib/schema/nudge';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** "Psst! Your Santa would love some ideas": shown to the giftee (or their manager), never who sent it. */
export const PsstNotice = ({ kind, forName }: { kind: NudgeKind; forName: string | null }) => {
  const t = useTranslations('between');
  const text =
    forName === null ? t(`for-you.psst-${kind}`) : t(`for-you.psst-${kind}-for`, { name: forName });

  return (
    <Alert role="status" variant="yellow">
      <Sparkles aria-hidden="true" />
      <AlertTitle>{t('psst.title')}</AlertTitle>
      <AlertDescription>
        <p>{text}</p>
        {forName === null && (
          <Link href="/wishlist" className={buttonVariants({ size: 'sm', className: 'mt-2' })}>
            {t('for-you.edit-wishlist')}
          </Link>
        )}
      </AlertDescription>
    </Alert>
  );
};
