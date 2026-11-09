import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { buttonVariants } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { SharePanel } from '../group/share-panel';

type CreatedShareProps = { slug: string; token: string; groupName: string };

/** Last step: the Secret Santa exists; share the link in the group chat. */
export const CreatedShare = ({ slug, token, groupName }: CreatedShareProps) => {
  const t = useTranslations('create.share');
  // A new group's language is the organizer's (the account setting the UI follows).
  const locale = useRouter().locale ?? 'en';
  // Replaces the form that had focus: start from the heading (49).
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <LogoAnimation variant="celebrate" className="mb-2 size-20" />
        <h1 ref={heading} tabIndex={-1} className="text-4xl font-extrabold outline-none sm:text-5xl">
          {t('title', { group: groupName })}
        </h1>
        <p className="text-lg">{t('description')}</p>
      </div>
      <SharePanel slug={slug} token={token} groupName={groupName} locale={locale} />
      <p className="text-muted">{t('later')}</p>
      <Link href={`/g/${slug}`} className={buttonVariants({ size: 'lg', variant: 'neutral', className: 'self-start' })}>
        {t('go-to-group')}
      </Link>
    </div>
  );
};
