import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { SharePanel } from '../group/share-panel';

type CreatedShareProps = { slug: string; token: string; groupName: string };

/** Last step: the Secret Santa exists; share the link in the group chat. */
export const CreatedShare = ({ slug, token, groupName }: CreatedShareProps) => {
  const t = useTranslations('create.share');
  // A new group's language is the organizer's (the account setting the UI follows).
  const locale = useRouter().locale ?? 'en';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <LogoAnimation variant="celebrate" className="mb-2 size-20" />
        <h1 className="text-4xl font-extrabold sm:text-5xl">{t('title', { group: groupName })}</h1>
        <p className="text-lg">{t('description')}</p>
      </div>
      <SharePanel slug={slug} token={token} groupName={groupName} locale={locale} />
      <p className="text-muted">{t('later')}</p>
      <Button size="lg" variant="neutral" className="self-start" nativeButton={false} render={<Link href={`/g/${slug}`} />}>
        {t('go-to-group')}
      </Button>
    </div>
  );
};
