import { useRequireSession } from '@/components/auth/use-require-session';
import { appErrorCode } from '@/components/group/app-error-code';
import { GroupNotFound } from '@/components/group/group-not-found';
import { GuessScoreboard } from '@/components/guess/guess-scoreboard';
import { useTRPC } from '@/lib/client/trpc';
import { isBeforeDraw, isFromGiftDay } from '@/lib/schema/edition';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { BigRevealCard } from './big-reveal-card';
import { LiveGuess } from './live-guess';
import { notice } from './presenter/presenter';
import { PresenterFrame } from './presenter/presenter-frame';
import { PresenterLoading } from './presenter/presenter-loading';
import { PresenterTitleSlide } from './presenter/presenter-title-slide';
import { UnwrapNow } from './unwrap-now';
import { useGiftDay, useGiftDayStream } from './use-gift-day';

/**
 * /g/[slug]/live (95): the presenter on a member's phone, from the member view, so the unwrap order stays a surprise:
 * waiting, who's next, who's unwrapping with my guess for their Santa, then the big reveal or the scoreboard.
 */
export const LiveStage = ({ groupSlug }: { groupSlug: string }) => {
  const t = useTranslations('giftday');
  const trpc = useTRPC();
  const user = useRequireSession();
  const group = useQuery({ ...trpc.group.get.queryOptions({ groupSlug }), enabled: !!user });
  const edition = group.data?.edition;
  const input = { groupSlug, editionNumber: edition?.number ?? 0 };
  const giftDay = useGiftDay(input, edition?.status ?? 'draft');
  // Whatever the status: the presenter can run before the gift day date (95).
  useGiftDayStream(input, Boolean(edition));
  const view = giftDay.data;
  const order = view?.unwrapOrder;

  const frame = (children: ReactNode) => (
    <PresenterFrame groupSlug={groupSlug} heading={group.data?.name ?? t('live.page-title')} closeLabel={t('live.close')}>
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
  if (group.error || giftDay.error) return frame(notice(t('errors.INTERNAL')));
  if (!view || !order?.started) {
    const loading = !group.data || (edition && !isBeforeDraw(edition) && !view);
    return frame(
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10 text-center">
        {loading ? <PresenterLoading /> : <PresenterTitleSlide title={edition?.status === 'drawn' ? edition.title : t('hero.title')} hint={t('live.waiting')} />}
      </div>
    );
  }
  const { guessing, reveal, swap } = view;
  const canReveal = reveal.enabled && Boolean(edition && isFromGiftDay(edition));
  return frame(
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-10">
      <UnwrapNow order={order} guessing={guessing} swap={swap} />
      {order.current && guessing && (
        <LiveGuess input={input} current={order.current} result={guessing.results.find((r) => r.memberId === order.current!.memberId)} />
      )}
      {order.finished && canReveal && !reveal.pairs && <p className="text-lg">{t('live.reveal-waiting')}</p>}
      <BigRevealCard reveal={reveal} guessing={guessing} />
      {/* Without the big reveal, the Santas shown at the turns are the scoreboard, as on the presenter's last slide. */}
      {order.finished && !canReveal && guessing && guessing.results.length > 0 && <GuessScoreboard guessing={guessing} />}
    </div>
  );
};
