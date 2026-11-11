import type { GroupData, GroupEdition } from '@/components/group/group-data';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/** Organizer, before the draw: the rules it follows, and where to change them. */
export const DrawRules = ({ group, edition }: { group: GroupData; edition: GroupEdition }) => {
  const t = useTranslations('draw.rules');
  if (!group.organizer) return null;
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? [];
  const keepApart = group.organizer.households.map((ids) => ids.flatMap(nameOf).join(' & ')).join(' · ');
  // Without an earlier edition there's nobody to avoid, whatever the setting says.
  const avoidPrevious = edition.avoidPreviousGiftees && edition.hasPreviousEdition;

  return (
    <div className="flex flex-col gap-1 border-2 border-dashed border-outline p-3 text-sm">
      <p className="font-semibold">{t('title')}</p>
      {avoidPrevious && <p>{t('avoid-previous')}</p>}
      {keepApart && <p>{t('keep-apart', { groups: keepApart })}</p>}
      {!avoidPrevious && !keepApart && <p>{t('none')}</p>}
      <Link href={`/g/${group.slug}/settings#draw`} className="self-start font-semibold">
        {t('edit')}
      </Link>
    </div>
  );
};
