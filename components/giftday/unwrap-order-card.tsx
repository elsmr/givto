import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RouterOutputs } from '@/lib/client/trpc';
import { Presentation } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ShuffleButton } from './shuffle-button';

type UnwrapOrderCardProps = {
  groupSlug: string;
  editionNumber: number;
  order: RouterOutputs['giftday']['get']['unwrapOrder'];
  meId: string;
  canShuffle: boolean;
  canPresent: boolean;
};

/** The unwrap order (32): the same random order for everyone, shuffled by the organizer or on gift day. */
export const UnwrapOrderCard = ({ groupSlug, editionNumber, order, meId, canShuffle, canPresent }: UnwrapOrderCardProps) => {
  const t = useTranslations('giftday.order');

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t('title')}</h2>
        </CardTitle>
        <CardDescription>{order ? t('intro') : canShuffle ? t('none-organizer') : t('none')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {order && (
          <ol className="flex flex-col gap-2">
            {order.people.map((person, index) => (
              <li key={person.memberId} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center border-2 border-ink bg-yellow font-bold text-ink">
                  {index + 1}
                </span>
                <span className="min-w-0 font-semibold break-words">
                  {person.name}
                  {person.memberId === meId && <span className="font-normal text-muted"> ({t('you')})</span>}
                </span>
              </li>
            ))}
          </ol>
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
