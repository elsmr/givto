import { GivtoLogo } from '@/components/givto-logo';
import { cn } from '@/lib/utils';
import { useReducedMotion } from 'motion/react';
import { useAnimate } from 'motion/react-mini';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { celebrateMoves, type Controls, hoverMoves, loadingMoves } from './logo-moves';

type LogoAnimationProps = { variant: 'loading' | 'celebrate' | 'hover'; className?: string };

const stop = (controls: Controls[]) => controls.forEach((control) => control.stop());

/**
 * The logo, animated (12). `loading` replaces the generic loader (announced as "Loading…");
 * `celebrate` is decorative; `hover` nudges the logo when a mouse enters the link around it.
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

    let controls: Controls[] | undefined;
    let stopped = false;
    // Stopped animations may still settle their promise, hence the flag.
    const run = (moves: typeof loadingMoves, again: boolean) => {
      controls = moves(animate);
      Promise.all(controls).then(() => {
        controls = undefined;
        if (again && !stopped) run(moves, again);
      });
    };
    const cleanup = () => {
      stopped = true;
      if (controls) stop(controls);
    };

    if (variant === 'loading') {
      run(loadingMoves, true);
      return cleanup;
    }

    // The whole link is the hover target, not just the mark; a nudge always plays to the end.
    const target = scope.current.closest('a') ?? scope.current;
    const nudge = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && !controls) run(hoverMoves, false);
    };
    target.addEventListener('pointerenter', nudge);
    return () => {
      target.removeEventListener('pointerenter', nudge);
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
    <span role="status" className="flex justify-center py-8">
      {logo}
      <span className="sr-only">{t('loading')}</span>
    </span>
  );
};
