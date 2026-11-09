import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { SharePanel } from '../group/share-panel';

type CreatedShareProps = { slug: string; token: string; groupName: string };

/** Last step: the Secret Santa exists; share the link in the group chat. */
export const CreatedShare = ({ slug, token, groupName }: CreatedShareProps) => {
  const t = useTranslations('create.share');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t('title', { group: groupName })}</h1>
        <p className="text-lg">{t('description')}</p>
      </div>
      <SharePanel slug={slug} token={token} groupName={groupName} />
      <p className="text-muted">{t('later')}</p>
      <Button size="lg" variant="neutral" className="self-start" nativeButton={false} render={<Link href={`/g/${slug}`} />}>
        {t('go-to-group')}
      </Button>
    </div>
  );
};
