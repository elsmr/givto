import { LogoAnimation } from '@/components/logo-animation/logo-animation';
import { FlowPage } from '@/components/shell/flow-page';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDivider } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { InvitePeople } from '../group/invite-people';

type CreatedShareProps = { slug: string; token: string; groupName: string };

/** Last step: the Secret Santa exists; get people in by link or QR, or by email. */
export const CreatedShare = ({ slug, token, groupName }: CreatedShareProps) => {
  const t = useTranslations('create.share');
  // A new group's language is the organizer's (the account setting the UI follows).
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
          <InvitePeople slug={slug} groupName={groupName} joinLink={{ token, revoked: false }} primary />
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
