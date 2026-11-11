import { VenetianMask } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** For the organizer next to the unwrap order (62): with guessing on, Santas come out at the turns. */
export const GuessingNote = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('guess.panel');

  return (
    <p className="flex items-start gap-2 text-sm text-muted">
      <VenetianMask aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        {t('note')}{' '}
        <Link href={`/g/${groupSlug}/settings#gift-day`} className="font-semibold">
          {t('settings')}
        </Link>
      </span>
    </p>
  );
};
