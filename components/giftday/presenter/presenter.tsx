import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { appErrorCode } from '../../group/app-error-code';
import { GroupNotFound } from '../../group/group-not-found';
import { useRequireSession } from '@/components/auth/use-require-session';
import { ShuffleButton } from '../shuffle-button';
import { PresenterFrame } from './presenter-frame';
import { PresenterLoading } from './presenter-loading';
import { PresenterStage } from './presenter-stage';

const notice = (text: string) => (
  <div className="mx-auto w-full max-w-xl px-6 py-16">
    <Alert>
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  </div>
);

/** /g/[slug]/present: the current edition's unwrap order on a big screen. Organizer only (PLAN-v2). */
export const Presenter = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('giftday');
  const trpc = useTRPC();
  const user = useRequireSession();
  const group = useQuery({ ...trpc.group.get.queryOptions({ groupSlug }), enabled: !!user });
  const editionNumber = group.data?.edition?.number ?? 0;
  const isOrganizer = Boolean(group.data?.me.isOrganizer);
  const view = useQuery({
    ...trpc.giftday.presenter.queryOptions({ groupSlug, editionNumber }),
    enabled: isOrganizer && editionNumber > 0,
  });

  const frame = (children: ReactNode) => (
    <PresenterFrame groupSlug={groupSlug} heading={group.data?.name}>
      {children}
    </PresenterFrame>
  );
  if (group.error && appErrorCode(group.error) === 'GROUP_NOT_FOUND') {
    return frame(
      <div className="px-6 py-12">
        <GroupNotFound />
      </div>
    );
  }
  if (group.error || view.error) return frame(notice(t('errors.INTERNAL')));
  if (group.data && !isOrganizer) return frame(notice(t('present.only-organizer')));
  if (group.data && !editionNumber) return frame(notice(t('present.no-order')));
  if (view.data && !view.data.unwrapOrder) {
    return frame(
      <div className="flex flex-col items-center gap-6 px-6 py-16 text-center">
        <p className="text-2xl font-semibold">{t('present.no-order')}</p>
        {(view.data.status === 'drawn' || view.data.status === 'giftday') && (
          <ShuffleButton groupSlug={groupSlug} editionNumber={editionNumber} again={false} />
        )}
      </div>
    );
  }
  // Loader and stage share one cell, so they cross-fade in place.
  return frame(
    <div className="grid flex-1 *:col-start-1 *:row-start-1">
      <AnimatePresence>
        {view.data?.unwrapOrder ? (
          <PresenterStage key="stage" groupSlug={groupSlug} editionNumber={editionNumber} view={view.data} order={view.data.unwrapOrder} />
        ) : (
          <PresenterLoading key="loading" />
        )}
      </AnimatePresence>
    </div>
  );
};
