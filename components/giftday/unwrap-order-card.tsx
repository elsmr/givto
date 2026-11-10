import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RouterOutputs } from '@/lib/client/trpc';
import { Check, Presentation } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ShuffleButton } from './shuffle-button';
import { UnwrapModeSelect } from './unwrap-mode-select';
import { UnwrapNow } from './unwrap-now';

type GiftDayView = RouterOutputs['giftday']['get'];
type UnwrapOrderCardProps = {
  groupSlug: string;
  editionNumber: number;
  order: GiftDayView['unwrapOrder'];
  mode: GiftDayView['unwrapMode'];
  meId: string;
  canShuffle: boolean;
  canPresent: boolean;
};

/** The unwrap order (32): a surprise until the presenter spins, so only who's unwrapping now and who already went; and the mode. */
export const UnwrapOrderCard = ({ groupSlug, editionNumber, order, mode, meId, canShuffle, canPresent }: UnwrapOrderCardProps) => {
  const t = useTranslations('giftday.order');
  const inProgress = Boolean(order?.started && !order.finished);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription>{order ? t('intro') : canShuffle ? t('none-organizer') : t('none')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {order?.started && <UnwrapNow order={order} />}
        {order && order.went.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">{t('went')}</h3>
            <ol className="flex flex-col gap-2">
              {order.went.map((person) => (
                <li key={person.memberId} className="flex items-center gap-3">
                  <span className="min-w-0 font-semibold break-words">
                    {person.name}
                    {person.memberId === meId && <span className="font-normal text-muted"> ({t('you')})</span>}
                  </span>
                  {person.done && <Check aria-label={t('done')} className="size-5 shrink-0" />}
                </li>
              ))}
            </ol>
          </div>
        )}
        {canShuffle ? (
          <UnwrapModeSelect groupSlug={groupSlug} editionNumber={editionNumber} mode={mode} locked={inProgress} />
        ) : (
          <p className="text-sm text-muted">
            {t(`modes.${mode}`)}: {t(`mode-help.${mode}`)}
          </p>
        )}
        {(canShuffle || canPresent) && (
          <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
            {canShuffle && <ShuffleButton groupSlug={groupSlug} editionNumber={editionNumber} again={Boolean(order)} />}
            {canPresent && order && (
              <Link href={`/g/${groupSlug}/present`} className={buttonVariants({ variant: 'neutral' })}>
                <Presentation aria-hidden="true" />
                {t('present')}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
