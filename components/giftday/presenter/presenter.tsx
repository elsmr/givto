import { JoinQrCode } from '@/components/group/join-qr-code';
import { liveUrl } from '@/components/group/join-url';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTRPC } from '@/lib/client/trpc';
import { isDrawn } from '@/lib/schema/edition';
import { useQuery } from '@tanstack/react-query';
import { QrCode } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { appErrorCode } from '../../group/app-error-code';
import { GroupNotFound } from '../../group/group-not-found';
import { useRequireSession } from '@/components/auth/use-require-session';
import { ShuffleButton } from '../shuffle-button';
import { PresenterFrame } from './presenter-frame';
import { PresenterLoading } from './presenter-loading';
import { PresenterSettings } from './presenter-settings';
import { PresenterStage } from './presenter-stage';

export const notice = (text: string) => (
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
  const [skipSpin, setSkipSpin] = useState(false);
  const edition = group.data?.edition;
  const order = view.data?.unwrapOrder;
  // The intro's QR again, for whoever joins late or drops off.
  const settings = edition && view.data && (
    <>
      <Dialog>
        <Tooltip>
          <DialogTrigger render={<TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={t('present.live')} />} />}>
            <QrCode aria-hidden="true" />
          </DialogTrigger>
          <TooltipContent side="bottom">{t('present.live')}</TooltipContent>
        </Tooltip>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('present.live')}</DialogTitle>
          </DialogHeader>
          <JoinQrCode url={liveUrl(groupSlug)} label={t('present.live-qr')} className="mx-auto size-72" />
          <p className="mono text-center break-all">{liveUrl(groupSlug)}</p>
        </DialogContent>
      </Dialog>
      <PresenterSettings
        groupSlug={groupSlug}
        edition={edition}
        mode={view.data.unwrapMode}
        inProgress={Boolean(order?.started && !order.finished)}
        skipSpin={skipSpin}
        onSkipSpinChange={setSkipSpin}
      />
    </>
  );

  const frame = (children: ReactNode) => (
    <PresenterFrame groupSlug={groupSlug} heading={group.data?.name} settings={settings}>
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
        {isDrawn(view.data) && (
          <ShuffleButton groupSlug={groupSlug} editionNumber={editionNumber} again={false} />
        )}
      </div>
    );
  }
  // Loader and stage share one cell, so they cross-fade in place.
  return frame(
    <div className="grid flex-1 *:col-start-1 *:row-start-1">
      <AnimatePresence>
        {view.data && order ? (
          <PresenterStage key="stage" groupSlug={groupSlug} editionNumber={editionNumber} view={view.data} order={order} skipSpin={skipSpin} />
        ) : (
          <PresenterLoading key="loading" />
        )}
      </AnimatePresence>
    </div>
  );
};
