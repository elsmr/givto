import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { FlowPage } from '@/components/shell/flow-page';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDivider } from '@/components/ui/card';
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
    <FlowPage
      eyebrow={<LogoAnimation variant="celebrate" className="size-20" />}
      title={t('title', { group: groupName })}
      description={t('description')}
      headingRef={heading}
    >
      <Card>
        <CardContent>
          <SharePanel slug={slug} token={token} groupName={groupName} locale={locale} primary />
        </CardContent>
        <CardDivider />
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted">{t('later')}</p>
          <Link href={`/g/${slug}`} className={buttonVariants({ variant: 'neutral', className: 'xs:self-start' })}>
            {t('go-to-group')}
          </Link>
        </CardContent>
      </Card>
    </FlowPage>
  );
};
