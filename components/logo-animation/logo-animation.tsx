import { GivtoLogo } from '@/components/givto-logo';
import { cn } from '@/lib/utils';
import { useReducedMotion } from 'motion/react';
import { useAnimate } from 'motion/react-mini';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { celebrateMoves, type Controls, hoverMoves, loadingMoves } from './logo-moves';

type LogoAnimationProps = { variant: 'loading' | 'celebrate' | 'hover' | 'toy'; className?: string };
type Moves = typeof loadingMoves;

const stop = (controls: Controls[]) => controls.forEach((control) => control.stop());

/**
 * The logo, animated (12). `loading` replaces the generic loader (announced as "Loading…");
 * `celebrate` is decorative; `hover` nudges the logo when a mouse enters the link around it; `toy`
 * nudges on hover and hops on a tap or click, for a logo that isn't a link.
 * Reduced motion: the static logo. Motion's WAAPI-only `useAnimate` keeps this small.
 */
export const LogoAnimation = ({ variant, className }: LogoAnimationProps) => {
  const t = useTranslations('ui');
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();

  useEffect(() => {
    if (reduced || !scope.current) return;
    if (variant === 'celebrate') {
      const controls = celebrateMoves(animate);
      return () => stop(controls);
    }

    let active: { moves: Moves; controls: Controls[] } | undefined;
    let stopped = false;
    // Stopped or cancelled animations may still settle their promise, hence the flag and the identity check.
    const run = (moves: Moves, again: boolean) => {
      const controls = moves(animate);
      active = { moves, controls };
      Promise.all(controls).then(() => {
        if (active?.controls !== controls) return;
        active = undefined;
        if (again && !stopped) run(moves, again);
      });
    };
    const cleanup = () => {
      stopped = true;
      if (active) stop(active.controls);
    };

    if (variant === 'loading') {
      run(loadingMoves, true);
      return cleanup;
    }

    // The whole link is the hover target, not just the mark; a nudge always plays to the end.
    const target = (variant === 'hover' && scope.current.closest('a')) || scope.current;
    const nudge = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && !active) run(hoverMoves, false);
    };
    // A hop cuts a nudge short: cancel, not stop, so the box drops back to rest instead of
    // freezing mid-tilt (stop commits the current transform).
    const hop = () => {
      if (active?.moves === celebrateMoves) return;
      active?.controls.forEach((control) => control.cancel());
      run(celebrateMoves, false);
    };
    target.addEventListener('pointerenter', nudge);
    if (variant === 'toy') target.addEventListener('pointerdown', hop);
    return () => {
      target.removeEventListener('pointerenter', nudge);
      target.removeEventListener('pointerdown', hop);
      cleanup();
    };
  }, [variant, reduced, animate, scope]);

  const logo = (
    <span ref={scope} className={cn('inline-block size-16', className)}>
      <GivtoLogo aria-hidden="true" className="size-full overflow-visible" />
    </span>
  );
  if (variant !== 'loading') return logo;
  return (
    <span role="status" data-page-loading className="flex justify-center py-8">
      {logo}
      <span className="sr-only">{t('loading')}</span>
    </span>
  );
};
