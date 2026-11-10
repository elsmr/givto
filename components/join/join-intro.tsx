import { formatBudget } from '@/components/group/format-budget';
import { FlowPage } from '@/components/shell/flow-page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardDivider, CardHeader } from '@/components/ui/card';
import { IconCardTitle } from '@/components/ui/icon-card-title';
import { formatLocalDate } from '@/lib/local-date';
import type { JoinPreview } from '@/lib/server/join-preview';
import { CalendarDays, Crown, Gift, Wallet } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

/** The invite as a card (who, when, how much); the step's form goes under the dashed rule. */
export const JoinIntro = ({ preview, children }: { preview: JoinPreview; children: ReactNode }) => {
  const t = useTranslations('join.intro');
  const tGroup = useTranslations('group');
  const format = useFormatter();
  const locale = useLocale();
  const { giftDay, budget } = preview;

  return (
    <FlowPage title={t('title')} description={t('description')}>
      <Card>
        <CardHeader className="gap-3">
          <IconCardTitle icon={Gift} tone="coral">
            {preview.groupName}
          </IconCardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary-muted">
              <Crown aria-hidden="true" />
              {t('organizer', { name: preview.organizerFirstName })}
            </Badge>
            {giftDay && (
              <Badge variant="yellow">
                <CalendarDays aria-hidden="true" />
                {t('gift-day', { date: formatLocalDate(giftDay, locale, { dateStyle: 'medium' }) })}
              </Badge>
            )}
            {budget && (
              <Badge variant="mint">
                <Wallet aria-hidden="true" />
                {tGroup('budget-chip', { budget: formatBudget(format, budget) })}
              </Badge>
            )}
          </div>
          {preview.requiresApproval && <CardDescription className="text-base">{t('approval')}</CardDescription>}
        </CardHeader>
        <CardDivider />
        <CardContent className="flex flex-col gap-6">{children}</CardContent>
      </Card>
    </FlowPage>
  );
};
